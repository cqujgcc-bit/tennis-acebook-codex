import { describe, expect, it } from "vitest";
import { splitSettlementAmount } from "./settlement-transfer";

describe("splitSettlementAmount", () => {
  it.each([
    [1, [1]],
    [20_000, [20_000]],
    [20_001, [20_000, 1]],
    [25_500, [20_000, 5_500]],
    [40_000, [20_000, 20_000]],
    [200_000, [20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000]],
  ])("splits %i fen without exceeding the WeChat per-transfer limit", (total, expected) => {
    const result = splitSettlementAmount(total as number);
    expect(result).toEqual(expected);
    expect(result.reduce((sum, amount) => sum + amount, 0)).toBe(total);
    expect(Math.max(...result)).toBeLessThanOrEqual(20_000);
  });

  it("rejects invalid totals", () => {
    expect(() => splitSettlementAmount(0)).toThrow();
    expect(() => splitSettlementAmount(1.5)).toThrow();
  });
});
