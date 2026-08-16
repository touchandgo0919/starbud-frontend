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
  User,
  AccessEvent,
  ReminderRecord,
  AiHomeOverview,
  RewardCenter
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
const sessionStorageKey = "starbud.accessSessionId";

function getSessionId() {
  let sessionId = sessionStorage.getItem(sessionStorageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(sessionStorageKey, sessionId);
  }
  return sessionId;
}

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
      "x-starbud-client": "web",
      "x-starbud-session-id": getSessionId(),
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

export async function trackAccessEvent(input: {
  eventName: string;
  route?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await request("/api/access-events", { method: "POST", body: JSON.stringify(input) });
  } catch {
    // Analytics must never block the primary workflow.
  }
}

export async function getAccessEvents(filters: { eventName?: string; clientType?: string; userName?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<{ events: AccessEvent[]; total: number }>(`/api/access-events${suffix}`);
}

export async function getReminderRecords(filters: {
  childId?: string;
  reminderType?: string;
  status?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<{
    records: ReminderRecord[];
    pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
  }>(`/api/reminder-records${suffix}`);
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

export async function logout() {
  await request<{ loggedOut: true }>("/api/auth/logout", { method: "POST" });
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

export async function getRewardCenter(childId?: string) {
  const suffix = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  return (await request<{ center: RewardCenter }>(`/api/rewards${suffix}`)).center;
}

export async function getRewardBalances() {
  return (await request<{ balances: Array<{ childId: string; balance: number }> }>("/api/rewards/balances")).balances;
}

export async function updateRewardSettings(familyId: string, input: { taskPoints: number; streakDays: number; streakBonusPoints: number }) {
  await request("/api/rewards/settings", { method: "PUT", body: JSON.stringify({ familyId, ...input }) });
}

export async function createFamilyReward(familyId: string, input: { title: string; pointCost: number; description: string }) {
  await request("/api/rewards/catalog", { method: "POST", body: JSON.stringify({ familyId, ...input }) });
}

export async function updateFamilyReward(id: string, familyId: string, input: { title: string; pointCost: number; description: string }) {
  await request(`/api/rewards/catalog/${id}`, { method: "PATCH", body: JSON.stringify({ familyId, ...input }) });
}

export async function deleteFamilyReward(id: string, familyId: string) {
  await request(`/api/rewards/catalog/${id}?familyId=${encodeURIComponent(familyId)}`, { method: "DELETE" });
}

export async function confirmRewardRedemption(id: string, approved: boolean) {
  await request(`/api/rewards/redemptions/${id}/confirm`, { method: "POST", body: JSON.stringify({ approved }) });
}

export async function getTodayTasks(childId?: string) {
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  const body = await request<{ tasks: Task[] }>(`/api/tasks/today${query}`);
  return body.tasks;
}

export async function getAiHomeOverview(options: { childId?: string; days?: 7 | 28 } = {}) {
  const query = new URLSearchParams();
  if (options.childId) query.set("childId", options.childId);
  query.set("days", String(options.days || 28));
  const body = await request<{ overview: AiHomeOverview }>(`/api/ai/home-overview?${query.toString()}`);
  return body.overview;
}

export async function getTasks(filters: {
  childId?: string;
  status?: string;
  keyword?: string;
  repeatType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  includeAttachments?: boolean;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  const body = await request<{ tasks: Task[] }>(`/api/tasks${suffix}`);
  return body.tasks.map((task) => ({
    ...task,
    attachmentPreviewUrl: task.attachmentPreviewUrl ? apiUrl(task.attachmentPreviewUrl) : null
  }));
}

export async function getTaskCalendar(dateFrom: string, dateTo: string, childId?: string) {
  const query = new URLSearchParams({ dateFrom, dateTo });
  if (childId) query.set("childId", childId);
  const body = await request<{ dates: Record<string, "revision" | "review" | "active" | "pending" | "completed"> }>(
    `/api/tasks/calendar?${query.toString()}`
  );
  return body.dates;
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

export async function repairTaskStatus(taskId: string, taskDate: string | null, status: "unclaimed" | "claimed" | "completed") {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}/status`, {
    method: "POST",
    body: JSON.stringify({ taskDate: taskDate || undefined, status })
  });
  return body.task;
}

export async function remindTask(taskId: string, taskDate?: string | null, reminderType?: "claim" | "complete" | "revision") {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}/remind`, {
    method: "POST",
    body: JSON.stringify({ taskDate: taskDate || undefined, reminderType })
  });
  return body.task;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const body = await request<{ task: Task }>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  return body.task;
}

export async function deleteTask(taskId: string, scope: "all" | "future" | "single" = "all", date?: string | null) {
  await request<{ deleted: true }>(`/api/tasks/${taskId}`, {
    method: "DELETE",
    body: JSON.stringify({ scope, date: date || undefined })
  });
}

export async function getSubmissions(options: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  childId?: string;
  status?: string;
  reviewStatus?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  const body = await request<{
    submissions: Submission[];
    pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
  }>(`/api/submissions${suffix}`);
  return { ...body, submissions: body.submissions.map(normalizeSubmissionUrls) };
}

function normalizeSubmissionUrls(submission: Submission): Submission {
  return {
    ...submission,
    photos: submission.photos.map((photo) => ({ ...photo, url: apiUrl(photo.url) })),
    audio: submission.audio ? { ...submission.audio, url: apiUrl(submission.audio.url) } : null,
    reviewImageUrl: submission.reviewImageUrl ? apiUrl(submission.reviewImageUrl) : null,
    reviewRounds: (submission.reviewRounds || []).map((round) => ({
      ...round,
      reviewImageUrl: round.reviewImageUrl ? apiUrl(round.reviewImageUrl) : "",
      photos: round.photos.map((photo) => ({ ...photo, url: apiUrl(photo.url) })),
      audios: (round.audios || []).map((audio) => ({ ...audio, url: apiUrl(audio.url) })),
      reviewImages: (round.reviewImages?.length ? round.reviewImages : round.reviewImageUrl
        ? [{ id: `legacy-${round.id}`, url: round.reviewImageUrl, contentType: "image/png", byteSize: 0, createdAt: round.reviewedAt }]
        : [])
        .map((image) => ({ ...image, url: apiUrl(image.url) }))
    }))
  };
}

export async function deleteSubmission(submissionId: string) {
  await request<{ deleted: true }>(`/api/submissions/${submissionId}`, { method: "DELETE" });
}

export async function getTaskSubmission(taskId: string, taskDate: string) {
  const body = await request<{ submission: Submission }>(`/api/tasks/${taskId}/submission?date=${encodeURIComponent(taskDate)}`);
  return normalizeSubmissionUrls(body.submission);
}

export async function submitSubmissionReview(submissionId: string, images: Blob[], replaceReviewImageIds: string[] = []) {
  const formData = new FormData();
  images.forEach((image, index) => formData.append("images", image, `review-${index + 1}.png`));
  replaceReviewImageIds.forEach((imageId) => formData.append("replaceReviewImageIds", imageId));
  const token = getStoredToken();
  const response = await fetch(apiUrl(`/api/submissions/${submissionId}/review`), {
    method: "POST",
    headers: {
      "x-starbud-client": "web",
      "x-starbud-session-id": getSessionId(),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  const body = await response.json() as { submission: Submission };
  return normalizeSubmissionUrls(body.submission);
}

export async function submitSubmissionAudioReview(submissionId: string, feedback: string) {
  const body = await request<{ submission: Submission }>(`/api/submissions/${submissionId}/audio-review`, {
    method: "POST",
    body: JSON.stringify({ feedback })
  });
  return normalizeSubmissionUrls(body.submission);
}

export async function finalizeSubmissionReview(submissionId: string) {
  const body = await request<{ submission: Submission }>(`/api/submissions/${submissionId}/finalize-review`, { method: "POST" });
  return normalizeSubmissionUrls(body.submission);
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
