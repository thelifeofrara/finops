import { describe, expect, it } from "vitest";
import { receiptsInRange } from "@/lib/domain/tax";
import { parseDate } from "@/lib/domain/dates";

describe("receiptsInRange", () => {
  it("counts money in within the range, excluding owner's capital", () => {
    const d = (s: string) => parseDate(s)!;
    const txs = [
      { date: d("2026-07-01"), amountQ: 10000, accountType: null },
      { date: d("2026-08-15"), amountQ: 5000, accountType: "ASSET" },
      { date: d("2026-08-16"), amountQ: 99999, accountType: "EQUITY" },
      { date: d("2026-08-17"), amountQ: -3000, accountType: "EXPENSE" },
      { date: d("2026-10-01"), amountQ: 7000, accountType: null },
    ];
    expect(receiptsInRange(txs, d("2026-07-01"), d("2026-09-30"))).toBe(15000);
  });
});
