import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Rubik tutorial public page", () => {
  it("keeps the tutorial inside the frontend deployment and exposes a public route", async () => {
    const router = await readFile(resolve("src/router/index.ts"), "utf8");
    const tutorial = await readFile(resolve("public/rubiks/index.html"), "utf8");

    expect(router).toContain('path: "/rubiks"');
    expect(router).toContain('meta: { public: true, title: "二阶魔方万能公式" }');
    expect(tutorial).toContain("二阶魔方万能公式");
    expect(tutorial).toContain("公式一：基础循环");
    expect(tutorial).toContain("@media (max-width:700px)");
  });
});
