import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TaskCalendar from "../src/components/TaskCalendar.vue";

const global = {
  stubs: {
    "el-icon": { template: "<span><slot /></span>" }
  }
};

describe("TaskCalendar", () => {
  it("renders a stable week, exposes task status and emits its visible range", async () => {
    const wrapper = mount(TaskCalendar, {
      props: {
        selectedDate: "2026-08-06",
        taskDates: { "2026-08-06": "revision" }
      },
      global
    });

    expect(wrapper.findAll(".task-calendar-day")).toHaveLength(7);
    expect(wrapper.get('[data-date="2026-08-06"]').attributes("aria-label")).toContain("有待修改任务");
    expect(wrapper.emitted("rangeChange")?.[0]).toEqual([{ from: "2026-08-02", to: "2026-08-08" }]);

    await wrapper.get('[data-date="2026-08-07"]').trigger("click");
    expect(wrapper.emitted("select")?.at(-1)).toEqual(["2026-08-07"]);
  });

  it("toggles a fixed 42-day month and navigates by month", async () => {
    const wrapper = mount(TaskCalendar, {
      props: { selectedDate: "2026-08-31", taskDates: {} },
      global
    });

    await wrapper.get('[data-testid="calendar-mode-button"]').trigger("click");
    expect(wrapper.findAll(".task-calendar-day")).toHaveLength(42);
    expect(wrapper.get('[data-testid="calendar-expand-button"]').attributes("aria-expanded")).toBe("true");

    await wrapper.get('[aria-label="下一周期"]').trigger("click");
    expect(wrapper.text()).toContain("2026年9月");
    expect(wrapper.emitted("select")?.at(-1)).toEqual(["2026-09-30"]);
  });
});
