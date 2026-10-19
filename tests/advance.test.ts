import { describe, expect, it } from "vitest";
import { quoteAdvance } from "@/lib/domain/advance";
import { parseDate } from "@/lib/domain/dates";

const asOf = parseDate("2026-10-19")!;

describe("advance quote", () => {
  it("quotes a grade A debtor at 80%, fee 1.8% per 30 days over the expected days", () => {
    const q = quoteAdvance({ outstandingQ: 1_000_000, dueDate: parseDate("2026-11-18")!, asOf, grade: "A", avgDaysLate: 15 });
    expect(q).toMatchObject({ eligible: true, advanceQ: 800_000, expectedDays: 30 + 15 });
    if (q.eligible) expect(q.feeQ).toBe(Math.round((800_000 * 180 * 45) / (30 * 10000)));
  });

  it("refuses overdue, too small, too soon and new debtors", () => {
    const base = { outstandingQ: 1_000_000, asOf, grade: "A" as const, avgDaysLate: 0 };
    expect(quoteAdvance({ ...base, dueDate: parseDate("2026-10-01")! })).toEqual({ eligible: false, reason: "overdue" });
    expect(quoteAdvance({ ...base, outstandingQ: 1000, dueDate: parseDate("2026-12-01")! })).toEqual({ eligible: false, reason: "too_small" });
    expect(quoteAdvance({ ...base, dueDate: parseDate("2026-10-22")! })).toEqual({ eligible: false, reason: "too_soon" });
    expect(quoteAdvance({ ...base, grade: "new", dueDate: parseDate("2026-12-01")! })).toEqual({ eligible: false, reason: "no_history" });
  });
});
