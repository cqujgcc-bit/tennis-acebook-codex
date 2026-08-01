import { describe, it, expect } from "vitest";

describe("WX_TPL_CIRCLE_MATCH 环境变量", () => {
  it("应已设置且不为 TPL_PENDING", () => {
    const val = process.env.WX_TPL_CIRCLE_MATCH;
    expect(val).toBeDefined();
    expect(val).not.toBe("TPL_PENDING");
    expect(val!.length).toBeGreaterThan(10);
  });
});
