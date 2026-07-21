import type { Child, CreateTaskPayload, Task, User } from "../types/task";

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
