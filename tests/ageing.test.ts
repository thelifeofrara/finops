import { describe, expect, it } from "vitest";
import { ageingSummary, bucketFor, invoiceStatus } from "@/lib/domain/ageing";
import { parseDate } from "@/lib/domain/dates";

const asOf = parseDate("2026-10-19")!;
const d = (s: string) => parseDate(s)!;

describe("ageing", () => {
  it("buckets by days overdue", () => {
    expect(bucketFor(d("2026-10-20"), asOf)).toBe("current");
    expect(bucketFor(d("2026-10-19"), asOf)).toBe("current");
    expect(bucketFor(d("2026-10-18"), asOf)).toBe("d1_30");
    expect(bucketFor(d("2026-09-19"), asOf)).toBe("d1_30");
    expect(bucketFor(d("2026-09-18"), asOf)).toBe("d31_60");
    expect(bucketFor(d("2026-06-01"), asOf)).toBe("d90_plus");
  });

  it("summarises only open balances", () => {
    const s = ageingSummary(
      [
        { id: "a", customerId: "c", dueDate: d("2026-11-01"), amountQ: 10000, paidQ: 0 },
        { id: "b", customerId: "c", dueDate: d("2026-10-01"), amountQ: 5000, paidQ: 2000 },
        { id: "c", customerId: "c", dueDate: d("2026-08-01"), amountQ: 9000, paidQ: 9000 },
        { id: "d", customerId: "c", dueDate: d("2026-08-01"), amountQ: 4000, paidQ: 0, voided: true },
      ],
      asOf,
    );
    expect(s.totalQ).toBe(13000);
    expect(s.overdueQ).toBe(3000);
    expect(s.buckets.d1_30).toBe(3000);
    expect(s.openCount).toBe(2);
  });

  it("reports status", () => {
    expect(invoiceStatus({ id: "x", customerId: "c", dueDate: d("2026-10-01"), amountQ: 100, paidQ: 100 }, asOf)).toBe("paid");
    expect(invoiceStatus({ id: "x", customerId: "c", dueDate: d("2026-10-01"), amountQ: 100, paidQ: 0 }, asOf)).toBe("overdue");
  });
});
