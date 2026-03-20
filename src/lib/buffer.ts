const BASE_URL = "https://api.bufferapp.com/1";

function getAccessToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error("BUFFER_ACCESS_TOKEN is not set");
  return token;
}

function url(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${sep}access_token=${getAccessToken()}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    ...options,
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Buffer API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// --- Profiles ---

export interface BufferProfile {
  id: string;
  service: string;
  formatted_username: string;
  avatar: string;
  default: boolean;
  [key: string]: unknown;
}

export async function listProfiles(): Promise<BufferProfile[]> {
  return request<BufferProfile[]>("/profiles.json");
}

export async function getProfile(profileId: string): Promise<BufferProfile> {
  return request<BufferProfile>(`/profiles/${profileId}.json`);
}

// --- Updates (Posts) ---

export interface BufferUpdate {
  id: string;
  text: string;
  status: string;
  created_at: number;
  due_at: number;
  profile_id: string;
  media: Record<string, string>;
  [key: string]: unknown;
}

interface UpdatesResponse {
  updates: BufferUpdate[];
  total: number;
}

export async function getPendingUpdates(
  profileId: string,
  params?: { page?: number; count?: number },
): Promise<UpdatesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.count) qs.set("count", String(params.count));
  const q = qs.toString();
  return request<UpdatesResponse>(
    `/profiles/${profileId}/updates/pending.json${q ? `?${q}` : ""}`,
  );
}

export async function getSentUpdates(
  profileId: string,
  params?: { page?: number; count?: number },
): Promise<UpdatesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.count) qs.set("count", String(params.count));
  const q = qs.toString();
  return request<UpdatesResponse>(
    `/profiles/${profileId}/updates/sent.json${q ? `?${q}` : ""}`,
  );
}

export async function getUpdate(updateId: string): Promise<BufferUpdate> {
  return request<BufferUpdate>(`/updates/${updateId}.json`);
}

export interface CreateUpdateInput {
  profile_ids: string[];
  text?: string;
  media?: { link?: string; photo?: string; thumbnail?: string; description?: string; title?: string };
  scheduled_at?: string;
  now?: boolean;
  top?: boolean;
}

export async function createUpdate(input: CreateUpdateInput): Promise<{ success: boolean; updates: BufferUpdate[] }> {
  const body = new URLSearchParams();
  for (const id of input.profile_ids) {
    body.append("profile_ids[]", id);
  }
  if (input.text) body.set("text", input.text);
  if (input.scheduled_at) body.set("scheduled_at", input.scheduled_at);
  if (input.now) body.set("now", "true");
  if (input.top) body.set("top", "true");
  if (input.media) {
    for (const [k, v] of Object.entries(input.media)) {
      if (v) body.set(`media[${k}]`, v);
    }
  }
  return request(`/updates/create.json`, { method: "POST", body: body.toString() });
}

export interface EditUpdateInput {
  text: string;
  media?: { link?: string; photo?: string; thumbnail?: string; description?: string; title?: string };
  scheduled_at?: string;
  now?: boolean;
}

export async function editUpdate(
  updateId: string,
  input: EditUpdateInput,
): Promise<{ success: boolean; update: BufferUpdate }> {
  const body = new URLSearchParams();
  body.set("text", input.text);
  if (input.scheduled_at) body.set("scheduled_at", input.scheduled_at);
  if (input.now) body.set("now", "true");
  if (input.media) {
    for (const [k, v] of Object.entries(input.media)) {
      if (v) body.set(`media[${k}]`, v);
    }
  }
  return request(`/updates/${updateId}/update.json`, { method: "POST", body: body.toString() });
}

export async function deleteUpdate(updateId: string): Promise<{ success: boolean }> {
  return request(`/updates/${updateId}/destroy.json`, { method: "POST" });
}

export async function shareUpdate(updateId: string): Promise<{ success: boolean }> {
  return request(`/updates/${updateId}/share.json`, { method: "POST" });
}
