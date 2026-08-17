import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("family reward rules", () => {
  it("shows the fixed on-time reward rule and keeps the settings panel concise", async () => {
    const source = await readFile(resolve("src/views/RewardManagementView.vue"), "utf8");

    expect(source).toContain("任务须在执行日当天或提前完成，逾期完成不获得积分。");
    expect(source).not.toContain("sameDayCompletionRequired");
    expect(source).toContain("保存规则");
    expect(source).not.toContain("规则按家庭生效，儿童完成任务后自动记入积分");
    expect(source).not.toContain("reward-family-scope");
  });
});
