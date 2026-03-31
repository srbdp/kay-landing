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

// --- Organization ---

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

// --- Channels ---

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
  avatar: string;
  isLocked: boolean;
  [key: string]: unknown;
}

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

// --- Posts ---

export interface BufferPost {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
  channelId: string;
  [key: string]: unknown;
}

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

export interface CreatePostInput {
  channelId: string;
  text: string;
  dueAt?: string;
  now?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<{ success: boolean; post: BufferPost }> {
  const mutationInput: Record<string, unknown> = {
    channelId: input.channelId,
    text: input.text,
    schedulingType: "automatic",
  };
  if (input.dueAt) mutationInput.dueAt = input.dueAt;
  if (input.now) mutationInput.mode = "shareNow";
  else if (input.dueAt) mutationInput.mode = "customScheduled";
  else mutationInput.mode = "addToQueue";

  const data = await gql<{
    createPost:
      | { post: BufferPost }
      | { message: string };
  }>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
            status
            createdAt
            dueAt
            channelId
          }
        }
        ... on InvalidInputError { message }
        ... on UnexpectedError { message }
        ... on UnauthorizedError { message }
        ... on LimitReachedError { message }
        ... on RestProxyError { message }
        ... on NotFoundError { message }
      }
    }`,
    { input: mutationInput },
  );
  if ("message" in data.createPost) {
    throw new Error(`Buffer createPost failed: ${data.createPost.message}`);
  }
  return { success: true, post: data.createPost.post };
}

export async function deletePost(postId: string): Promise<{ success: boolean }> {
  const data = await gql<{
    deletePost: { __typename: string };
  }>(
    `mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        ... on DeletePostSuccess { __typename }
        ... on VoidMutationError { __typename }
      }
    }`,
    { input: { id: postId } },
  );
  if (data.deletePost.__typename === "VoidMutationError") {
    throw new Error("Buffer deletePost failed");
  }
  return { success: true };
}
