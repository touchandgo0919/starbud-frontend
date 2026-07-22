import type { Child, CreateTaskPayload, Family, Task, User } from "../types/task";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? "http://localhost:8787" : "https://starbud-backend.zhaotao0919.workers.dev");

const tokenStorageKey = "starbud.authToken";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export async function deleteTask(taskId: string) {
  await request<{ deleted: true }>(`/api/tasks/${taskId}`, {
    method: "DELETE"
  });
}
