import type {
  Child,
  CreateChildPayload,
  CreateTaskPayload,
  Family,
  ManagedUser,
  RegisterPayload,
  SaveUserPayload,
  Submission,
  Task,
  UpdateTaskPayload,
  User
} from "../types/task";

const apiBaseUrls = {
  "zhaojianing.com": "https://starbud-api.zhaojianing.com",
  "zhaoyouning.com": "https://starbud-api.zhaoyouning.com"
} as const;

function apiBaseUrlForHostname(hostname: string) {
  const normalizedHostname = hostname.trim().toLocaleLowerCase();
  const domain = (Object.keys(apiBaseUrls) as Array<keyof typeof apiBaseUrls>)
    .find((candidate) =>
      normalizedHostname === candidate || normalizedHostname.endsWith(`.${candidate}`)
    );
  return domain ? apiBaseUrls[domain] : "";
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const runtimeApiBaseUrl = apiBaseUrlForHostname(window.location.hostname);
const API_BASE_URL =
  runtimeApiBaseUrl ||
  configuredApiBaseUrl ||
  apiBaseUrls["zhaojianing.com"];

const tokenStorageKey = "starbud.authToken";

function apiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
}

export function getStoredToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function setStoredToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearStoredToken() {
  localStorage.removeItem(tokenStorageKey);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const body = await request<{ user: User; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  setStoredToken(body.token);
  return body.user;
}

export async function registerParent(payload: RegisterPayload) {
  const body = await request<{ user: User; token: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setStoredToken(body.token);
  return body.user;
}

export async function getMe() {
  const body = await request<{ user: User }>("/api/me");
  return body.user;
}

export async function getChildren() {
  const body = await request<{ children: Child[] }>("/api/children");
  return body.children;
}

export async function getFamilies() {
  const body = await request<{ families: Family[] }>("/api/families");
  return body.families;
}

export async function createFamily(name: string) {
  const body = await request<{ family: Family }>("/api/families", {
    method: "POST",
    body: JSON.stringify({ name })
  });
  return body.family;
}

export async function updateFamily(familyId: string, name: string) {
  const body = await request<{ family: Family }>(`/api/families/${familyId}`, {
    method: "PATCH",
    body: JSON.stringify({ name })
  });
  return body.family;
}

export async function deleteFamily(familyId: string) {
  await request<{ deleted: true }>(`/api/families/${familyId}`, {
    method: "DELETE"
  });
}

export async function addFamilyMember(
  familyId: string,
  username: string,
  relationship: string
) {
  const body = await request<{ family: Family }>(`/api/families/${familyId}/members`, {
    method: "POST",
    body: JSON.stringify({ username, relationship })
  });
  return body.family;
}

export async function createFamilyChild(familyId: string, payload: CreateChildPayload) {
  const body = await request<{ family: Family }>(`/api/families/${familyId}/children`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return body.family;
}

export async function updateFamilyMember(
  familyId: string,
  memberId: string,
  relationship: string
) {
  const body = await request<{ family: Family }>(
    `/api/families/${familyId}/members/${memberId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ relationship })
    }
  );
  return body.family;
}

export async function removeFamilyMember(familyId: string, memberId: string) {
  await request<{ removed: true }>(`/api/families/${familyId}/members/${memberId}`, {
    method: "DELETE"
  });
}

export async function getTodayTasks(childId?: string) {
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  const body = await request<{ tasks: Task[] }>(`/api/tasks/today${query}`);
  return body.tasks;
}

export async function getTasks(filters: {
  childId?: string;
  status?: string;
  keyword?: string;
  repeatType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  const body = await request<{ tasks: Task[] }>(`/api/tasks${suffix}`);
  return body.tasks;
}

export async function createTask(payload: CreateTaskPayload) {
  const body = await request<{ task: Task }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return body.task;
}

export async function completeTask(taskId: string) {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}/complete`, {
    method: "POST"
  });

  return body.task;
}

export async function remindTask(taskId: string) {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}/remind`, { method: "POST" });
  return body.task;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  return body.task;
}

export async function deleteTask(taskId: string) {
  await request<{ deleted: true }>(`/api/tasks/${taskId}`, {
    method: "DELETE"
  });
}

export async function getSubmissions() {
  const body = await request<{ submissions: Submission[] }>("/api/submissions");
  return body.submissions.map((submission) => ({
    ...submission,
    photos: submission.photos.map((photo) => ({ ...photo, url: apiUrl(photo.url) })),
    reviewImageUrl: submission.reviewImageUrl ? apiUrl(submission.reviewImageUrl) : null
  }));
}

export async function deleteSubmission(submissionId: string) {
  await request<{ deleted: true }>(`/api/submissions/${submissionId}`, { method: "DELETE" });
}

export async function getTaskSubmission(taskId: string, taskDate: string) {
  const body = await request<{ submission: Submission }>(`/api/tasks/${taskId}/submission?date=${encodeURIComponent(taskDate)}`);
  return {
    ...body.submission,
    photos: body.submission.photos.map((photo) => ({ ...photo, url: apiUrl(photo.url) })),
    reviewImageUrl: body.submission.reviewImageUrl ? apiUrl(body.submission.reviewImageUrl) : null
  };
}

export async function submitSubmissionReview(submissionId: string, image: Blob) {
  const formData = new FormData();
  formData.append("image", image, "review.png");
  const token = getStoredToken();
  const response = await fetch(apiUrl(`/api/submissions/${submissionId}/review`), {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: formData
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  const body = await response.json() as { submission: Submission };
  return {
    ...body.submission,
    photos: body.submission.photos.map((photo) => ({ ...photo, url: apiUrl(photo.url) })),
    reviewImageUrl: body.submission.reviewImageUrl ? apiUrl(body.submission.reviewImageUrl) : null
  };
}

export async function getUsers() {
  const body = await request<{ users: ManagedUser[] }>("/api/admin/users");
  return body.users;
}

export async function createUser(payload: SaveUserPayload) {
  const body = await request<{ user: ManagedUser }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return body.user;
}

export async function updateUser(userId: string, payload: Partial<SaveUserPayload>) {
  const body = await request<{ user: ManagedUser }>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return body.user;
}
