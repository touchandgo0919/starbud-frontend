import { describe, expect, it } from "vitest";
import { taskStateClass, taskStatusLabel } from "../src/utils/task-status";

const base = {
  status: "pending" as const,
  reviewStatus: "pending_submission" as const,
  claimedAt: null,
  requiresPhotoUpload: true,
  finalizedAt: null
};

describe("shared task status", () => {
  it("separates unclaimed tasks from claimed tasks waiting for a submission", () => {
    expect(taskStatusLabel(base)).toBe("待领取");
    expect(taskStateClass(base)).toBe("task-state--pending");
    const claimed = { ...base, claimedAt: "2026-10-19 18:01:00" };
    expect(taskStatusLabel(claimed)).toBe("待提交");
    expect(taskStateClass(claimed)).toBe("task-state--active");
    expect(taskStatusLabel({ ...claimed, reviewStatus: "submitting" as const })).toBe("提交中");
  });

  it("puts review states ahead of completion so resubmissions stay visible", () => {
    expect(taskStatusLabel({ ...base, status: "completed" as const, reviewStatus: "pending_review" as const })).toBe("待批改");
    expect(taskStatusLabel({ ...base, reviewStatus: "needs_revision" as const })).toBe("待修改");
    expect(taskStateClass({ ...base, reviewStatus: "needs_revision" as const })).toBe("task-state--revision");
  });

  it("treats closed or claim-only finished tasks as completed", () => {
    expect(taskStatusLabel({ ...base, reviewStatus: "completed" as const })).toBe("已完成");
    expect(taskStatusLabel({ ...base, requiresPhotoUpload: false, reviewStatus: "not_required" as const, status: "completed" as const })).toBe("已完成");
    expect(taskStatusLabel({ ...base, finalizedAt: "2026-10-19 20:00:00" })).toBe("已完成");
  });
});
