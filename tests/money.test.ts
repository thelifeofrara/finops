import { describe, expect, it } from "vitest";
import { applyBp, formatMoney, parseMoney, toDecimalString } from "@/lib/domain/money";

describe("parseMoney", () => {
  it.each([
    ["1 234,56", 123456],
    ["1,234.56", 123456],
    ["1234.5", 123450],
    ["-50", -5000],
    ["12,3 ₼", 1230],
    ["1.234,00", 123400],
  ])("parses %s", (input, q) => expect(parseMoney(input)).toBe(q));

  it("returns null for non-numbers", () => {
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
});

describe("formatting and rounding", () => {
  it("formats qəpik as manat", () => {
    expect(formatMoney(123456)).toBe("1 234,56 ₼");
    expect(formatMoney(-500)).toBe("−5,00 ₼");
  });
  it("produces decimal strings", () => {
    expect(toDecimalString(-5)).toBe("-0.05");
  });
  it("applies basis points with half-up rounding", () => {
    expect(applyBp(10000, 180)).toBe(180);
    expect(applyBp(1, 5000)).toBe(1);
  });
});
