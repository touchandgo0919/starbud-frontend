import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard learning issue summary", () => {
  it("keeps automatic historical issues inside Growth Observation only", async () => {
    const source = await readFile(resolve("src/views/DashboardView.vue"), "utf8");
    const growthStart = source.indexOf("dashboardSection === 'insights'");
    const issueStart = source.indexOf('class="learning-issue-observation"');
    const growthEnd = source.indexOf("<el-dialog", growthStart);
    const todayStart = source.indexOf("<template v-if=\"dashboardSection === 'today'\">");

    expect(growthStart).toBeGreaterThan(-1);
    expect(issueStart).toBeGreaterThan(growthStart);
    expect(issueStart).toBeLessThan(growthEnd);
    expect(source.slice(todayStart, growthStart)).not.toContain("learning-issue-observation");
    expect(source).toContain("根据家长已完成的批改自动整理，无需额外记录");
    expect(source).toContain("本期没有重复出现两次以上的问题");
  });
});
