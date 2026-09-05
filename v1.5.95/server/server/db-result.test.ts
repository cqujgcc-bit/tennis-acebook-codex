import { describe, expect, it } from "vitest";
import { getAffectedRows } from "./_core/db-result";

describe("getAffectedRows", () => {
  it("reads mysql2 tuple results", () => {
    expect(getAffectedRows([{ affectedRows: 1 }, []])).toBe(1);
  });

  it("reads direct mutation headers", () => {
    expect(getAffectedRows({ affectedRows: 2 })).toBe(2);
    expect(getAffectedRows({ rowsAffected: 3 })).toBe(3);
  });

  it("returns zero for missing metadata", () => {
    expect(getAffectedRows(undefined)).toBe(0);
    expect(getAffectedRows([{}])).toBe(0);
  });
});
