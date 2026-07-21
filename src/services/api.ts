import type { CreateTaskPayload, Task } from "../types/task";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? "http://localhost:8787" : "https://starbud-backend.zhaotao0919.workers.dev");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getTodayTasks() {
  const body = await request<{ tasks: Task[] }>("/api/tasks/today");
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
