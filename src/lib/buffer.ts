const BASE_URL = "https://api.buffer.com";

function getAccessToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error("BUFFER_ACCESS_TOKEN is not set");
  return token;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Buffer API ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`Buffer GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Buffer API returned no data");
  }
  return json.data;
}

// --- Organization (needed for channel/post queries) ---

let cachedOrgId: string | null = null;

async function getOrganizationId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  const data = await gql<{ account: { organizations: { id: string }[] } }>(`
    query GetOrganizations {
      account {
        organizations {
          id
        }
      }
    }
  `);
  const orgs = data.account.organizations;
  if (!orgs.length) throw new Error("No Buffer organizations found");
  cachedOrgId = orgs[0].id;
  return cachedOrgId;
}

// --- Channels (replaces Profiles) ---

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
  avatar: string;
  isLocked: boolean;
  [key: string]: unknown;
}

// Keep old name as alias for backward compat in routes
export type BufferProfile = BufferChannel;

export async function listChannels(): Promise<BufferChannel[]> {
  const orgId = await getOrganizationId();
  const data = await gql<{ channels: BufferChannel[] }>(
    `query ListChannels($input: ChannelsInput!) {
      channels(input: $input) {
        id
        name
        service
        avatar
        isLocked
      }
    }`,
    { input: { organizationId: orgId } },
  );
  return data.channels;
}

export async function getChannel(channelId: string): Promise<BufferChannel> {
  const data = await gql<{ channel: BufferChannel }>(
    `query GetChannel($input: ChannelInput!) {
      channel(input: $input) {
        id
        name
        service
        avatar
        isLocked
      }
    }`,
    { input: { id: channelId } },
  );
  return data.channel;
}

// Backward-compat aliases
export const listProfiles = listChannels;
export const getProfile = getChannel;

// --- Posts (replaces Updates) ---

export interface BufferPost {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
  channelId: string;
  [key: string]: unknown;
}

// Backward-compat alias
export type BufferUpdate = BufferPost;

export async function listPosts(
  channelId?: string,
  params?: { status?: string; first?: number; after?: string },
): Promise<{ posts: BufferPost[]; hasNextPage: boolean; endCursor: string | null }> {
  const orgId = await getOrganizationId();
  const input: Record<string, unknown> = { organizationId: orgId };
  if (channelId) input.channelIds = [channelId];
  if (params?.status) input.status = params.status;

  const data = await gql<{
    posts: {
      edges: { node: BufferPost }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query ListPosts($input: PostsInput!, $first: Int, $after: String) {
      posts(input: $input, first: $first, after: $after) {
        edges {
          node {
            id
            text
            status
            createdAt
            dueAt
            channelId
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { input, first: params?.first ?? 20, after: params?.after ?? null },
  );
  return {
    posts: data.posts.edges.map((e) => e.node),
    hasNextPage: data.posts.pageInfo.hasNextPage,
    endCursor: data.posts.pageInfo.endCursor,
  };
}

// Backward-compat wrappers
export async function getPendingUpdates(
  channelId: string,
  params?: { page?: number; count?: number },
): Promise<{ updates: BufferPost[]; total: number }> {
  const result = await listPosts(channelId, { status: "pending", first: params?.count ?? 20 });
  return { updates: result.posts, total: result.posts.length };
}

export async function getSentUpdates(
  channelId: string,
  params?: { page?: number; count?: number },
): Promise<{ updates: BufferPost[]; total: number }> {
  const result = await listPosts(channelId, { status: "sent", first: params?.count ?? 20 });
  return { updates: result.posts, total: result.posts.length };
}

export async function getPost(postId: string): Promise<BufferPost> {
  const data = await gql<{ post: BufferPost }>(
    `query GetPost($input: PostInput!) {
      post(input: $input) {
        id
        text
        status
        createdAt
        dueAt
        channelId
      }
    }`,
    { input: { id: postId } },
  );
  return data.post;
}

// Backward-compat alias
export const getUpdate = getPost;

export interface CreatePostInput {
  channelId: string;
  text: string;
  dueAt?: string;
  now?: boolean;
}

// Backward-compat alias
export type CreateUpdateInput = {
  profile_ids: string[];
  text?: string;
  media?: Record<string, string>;
  scheduled_at?: string;
  now?: boolean;
  top?: boolean;
};

export async function createPost(input: CreatePostInput): Promise<{ success: boolean; post: BufferPost }> {
  const mutationInput: Record<string, unknown> = {
    channelId: input.channelId,
    text: input.text,
  };
  if (input.dueAt) mutationInput.dueAt = input.dueAt;
  if (input.now) mutationInput.mode = "shareNow";
  else if (input.dueAt) mutationInput.mode = "customScheduled";
  else mutationInput.mode = "addToQueue";

  const data = await gql<{ createPost: { post: BufferPost } }>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        post {
          id
          text
          status
          createdAt
          dueAt
          channelId
        }
      }
    }`,
    { input: mutationInput },
  );
  return { success: true, post: data.createPost.post };
}

// Backward-compat wrapper: accepts old-style profile_ids[] input
export async function createUpdate(
  input: CreateUpdateInput,
): Promise<{ success: boolean; updates: BufferPost[] }> {
  const posts: BufferPost[] = [];
  for (const channelId of input.profile_ids) {
    const result = await createPost({
      channelId,
      text: input.text ?? "",
      dueAt: input.scheduled_at,
      now: input.now,
    });
    posts.push(result.post);
  }
  return { success: true, updates: posts };
}

export async function deletePost(postId: string): Promise<{ success: boolean }> {
  await gql<{ deletePost: { success: boolean } }>(
    `mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        success
      }
    }`,
    { input: { id: postId } },
  );
  return { success: true };
}

// Backward-compat alias
export const deleteUpdate = deletePost;

// Note: editUpdate and shareUpdate are not supported in the new Buffer API beta.
// editUpdate will throw; shareUpdate is replaced by createPost with mode "shareNow".
export async function editUpdate(
  _updateId: string,
  _input: { text: string; media?: Record<string, string>; scheduled_at?: string; now?: boolean },
): Promise<{ success: boolean; update: BufferPost }> {
  throw new Error("Editing posts is not yet supported by the new Buffer API. Delete and recreate instead.");
}

export async function shareUpdate(updateId: string): Promise<{ success: boolean }> {
  // In the new API, there's no separate "share" action.
  // Posts are published based on their mode (shareNow, addToQueue, etc.)
  throw new Error(
    `Share action is not supported in the new Buffer API. Post ${updateId} should be created with mode "shareNow" instead.`,
  );
}
