import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("family reward rules", () => {
  it("defaults to same-day rewards and keeps the settings panel concise", async () => {
    const source = await readFile(resolve("src/views/RewardManagementView.vue"), "utf8");

    expect(source).toContain("sameDayCompletionRequired: true");
    expect(source).toContain("仅任务当天完成可获得积分和连续奖励");
    expect(source).toContain("保存规则");
    expect(source).not.toContain("规则按家庭生效，儿童完成任务后自动记入积分");
    expect(source).not.toContain("reward-family-scope");
  });
});
