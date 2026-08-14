import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("web API client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  it("logs in, persists the token and identifies later calls as one web session", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        user: { id: "parent-1", username: "parent", displayName: "家长", role: "parent" },
        token: "signed-token"
      }))
      .mockResolvedValueOnce(jsonResponse({
        user: { id: "parent-1", username: "parent", displayName: "家长", role: "parent" }
      }));
    const api = await import("../src/services/api");

    await expect(api.login("parent", "secret")).resolves.toMatchObject({ role: "parent" });
    expect(localStorage.getItem("starbud.authToken")).toBe("signed-token");
    await api.getMe();

    const [loginUrl, loginInit] = fetchMock.mock.calls[0];
    const [meUrl, meInit] = fetchMock.mock.calls[1];
    expect(String(loginUrl)).toMatch(/\/api\/auth\/login$/);
    expect(String(meUrl)).toMatch(/\/api\/me$/);
    expect(JSON.parse(String(loginInit?.body))).toEqual({ username: "parent", password: "secret" });
    expect(new Headers(loginInit?.headers).get("x-starbud-client")).toBe("web");
    expect(new Headers(meInit?.headers).get("authorization")).toBe("Bearer signed-token");
    expect(new Headers(meInit?.headers).get("x-starbud-session-id"))
      .toBe(new Headers(loginInit?.headers).get("x-starbud-session-id"));
  });

  it("encodes filters and normalizes protected submission file URLs", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      submissions: [{
        id: "submission-1",
        photos: [{ id: "photo-1", url: "/api/submission-files/photo-1?token=x" }],
        audio: { id: "audio-1", url: "/api/submission-audio/audio-1?token=x" },
        reviewImageUrl: "/api/review-files/review-1?token=x",
        reviewRounds: [{
          id: "round-1",
          photos: [],
          audios: [],
          reviewImages: [],
          reviewImageUrl: "",
          reviewedAt: "2026-08-06 10:00:00"
        }]
      }],
      pagination: { page: 2, pageSize: 10, total: 11, hasMore: false }
    }));
    const api = await import("../src/services/api");

    const result = await api.getSubmissions({ page: 2, pageSize: 10, keyword: "数学 作业", status: "submitted" });

    expect(String(fetchMock.mock.calls[0][0])).toContain("keyword=%E6%95%B0%E5%AD%A6+%E4%BD%9C%E4%B8%9A");
    expect(result.submissions[0].photos[0].url).toMatch(/^https?:\/\//);
    expect(result.submissions[0].audio?.url).toMatch(/^https?:\/\//);
    expect(result.submissions[0].reviewImageUrl).toMatch(/^https?:\/\//);
  });

  it("sends multipart reviews without a JSON content type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      submission: {
        id: "submission-1",
        photos: [],
        audio: null,
        reviewImageUrl: null,
        reviewRounds: []
      }
    }));
    const api = await import("../src/services/api");
    api.setStoredToken("reviewer-token");

    await api.submitSubmissionReview("submission-1", [new Blob(["png"], { type: "image/png" })]);

    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBeInstanceOf(FormData);
    expect(new Headers(init?.headers).get("content-type")).toBeNull();
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer reviewer-token");
  });

  it("loads the homepage AI overview with member and period filters", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      overview: {
        generatedAt: "2026-08-07 08:00:00",
        analysisMode: "deterministic",
        period: { days: 28, from: "2026-07-11", to: "2026-08-07" },
        scope: { childId: "child-1", childName: "赵佑宁" },
        dataStatus: "ready",
        confidence: "high",
        summary: { title: "执行稳定", description: "基于任务记录生成" },
        metrics: { totalTasks: 12, completionRate: 80, completionRateDelta: 10, onTimeRate: 75, averageClaimDelayMinutes: 8, revisionRate: 20 },
        trend: [],
        insights: [],
        learningIssues: {
          status: "ready",
          analyzedReviews: 3,
          analyzingReviews: 0,
          issueCount: 2,
          summary: "进位加法在本期出现 2 次。",
          recurring: [{ topic: "进位加法", category: "calculation", count: 2, lastSeenAt: "2026-08-07 08:00:00", childName: "赵佑宁" }],
          recent: [],
          resolved: []
        }
      }
    }));
    const api = await import("../src/services/api");

    const overview = await api.getAiHomeOverview({ childId: "child-1", days: 28 });

    expect(overview.scope.childName).toBe("赵佑宁");
    expect(overview.learningIssues.recurring[0].topic).toBe("进位加法");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/ai/home-overview?childId=child-1&days=28");
  });

  it("sends the occurrence and reminder type for an immediate child reminder", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ task: { id: "task-1" } }));
    const api = await import("../src/services/api");

    await api.remindTask("task-1", "2026-08-14", "revision");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/tasks\/task-1\/remind$/);
    expect(JSON.parse(String(init?.body))).toEqual({ taskDate: "2026-08-14", reminderType: "revision" });
  });

  it("surfaces backend error messages and keeps analytics non-blocking", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "账号无权限" }, 403))
      .mockRejectedValueOnce(new Error("offline"));
    const api = await import("../src/services/api");

    await expect(api.getFamilies()).rejects.toThrow("账号无权限");
    await expect(api.trackAccessEvent({ eventName: "view_opened" })).resolves.toBeUndefined();
  });
});
