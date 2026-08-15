import { describe, expect, it } from "vitest";
import { nextEditableOccurrence } from "../src/utils/task-edit";

describe("nextEditableOccurrence", () => {
  it("moves a historical daily task to today without rewriting history", () => {
    expect(nextEditableOccurrence({ repeatType: "daily", startDate: "2026-08-01", endDate: null }, "2026-08-15")).toBe("2026-08-15");
  });

  it("moves a historical weekly task to its next scheduled weekday", () => {
    expect(nextEditableOccurrence({ repeatType: "weekly", startDate: "2026-08-03", endDate: null }, "2026-08-15")).toBe("2026-08-17");
  });

  it("does not reopen an expired one-time task", () => {
    expect(nextEditableOccurrence({ repeatType: "once", startDate: "2026-08-14", endDate: "2026-08-14" }, "2026-08-15")).toBeNull();
  });
});
