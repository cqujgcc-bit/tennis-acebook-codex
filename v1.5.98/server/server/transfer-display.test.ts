import { describe, expect, it } from "vitest";
import { buildMatchTransferRemark } from "./wxpay";

describe("微信结算展示备注", () => {
  it("明确显示 AceBook 球局场地费结算", () => {
    expect(buildMatchTransferRemark("周日欢乐双打")).toBe("AceBook球局场地费结算-周日欢乐双打");
  });

  it("补缴备注使用补缴文案", () => {
    expect(buildMatchTransferRemark("夜场球局", "topup")).toBe("AceBook球局场地费补缴-夜场球局");
  });

  it("满足微信最多 32 字符限制", () => {
    expect(buildMatchTransferRemark("这是一个特别特别长的球局名称用于验证微信备注长度限制").length).toBeLessThanOrEqual(32);
  });
});
