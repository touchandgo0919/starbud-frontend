import { mount, flushPromises } from "@vue/test-utils";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import router from "../src/router";
import AiDesignView from "../src/views/AiDesignView.vue";

describe("public product pages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll("style[data-starbud-ai-design]").forEach((style) => style.remove());
  });

  it("exposes the AI design page without authentication", () => {
    const route = router.getRoutes().find((item) => item.path === "/ai");

    expect(route?.name).toBe("AiDesign");
    expect(route?.meta.public).toBe(true);
  });

  it("renders the complete standalone design document and preserves tab interaction", async () => {
    const designHtml = await readFile(resolve("public/ai-design.html"), "utf8");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(designHtml, { status: 200 })));
    const wrapper = mount(AiDesignView);
    await flushPromises();

    expect(wrapper.text()).toContain("用数据解释变化，把决定留给家长");
    expect(wrapper.text()).toContain("儿童数据安全");
    expect(wrapper.text()).toContain("从可验证周报开始");
    expect(wrapper.findAll(".design-tab")).toHaveLength(2);

    await wrapper.findAll(".design-tab")[1].trigger("click");
    expect(wrapper.get("#child-panel").classes()).toContain("is-active");
    expect(wrapper.get("#parent-panel").classes()).not.toContain("is-active");

    wrapper.unmount();
    expect(document.querySelector("style[data-starbud-ai-design]")).toBeNull();
  });
});
