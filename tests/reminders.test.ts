import { describe, expect, it } from "vitest";
import { decideReminder, renderTemplate } from "@/lib/domain/reminders";
import { parseDate } from "@/lib/domain/dates";

const all = new Set(["BEFORE_DUE", "DUE", "OVERDUE_7", "OVERDUE_14", "OVERDUE_30"] as const);

describe("reminders", () => {
  it("sends the latest due stage and skips missed earlier ones", () => {
    const d = decideReminder(parseDate("2026-09-01")!, parseDate("2026-09-20")!, new Set(), new Set(all));
    expect(d.send).toBe("OVERDUE_14");
    expect(d.skip).toEqual(expect.arrayContaining(["BEFORE_DUE", "DUE", "OVERDUE_7"]));
  });
  it("does not resend a handled stage", () => {
    const handled = new Set(["BEFORE_DUE", "DUE"] as const);
    expect(decideReminder(parseDate("2026-09-01")!, parseDate("2026-09-02")!, new Set(handled), new Set(all)).send).toBeNull();
  });
  it("renders placeholders", () => {
    const t = renderTemplate("{customer}: {number} {amount} {due_date}", {
      customer: "Nur", business: "B", number: "FT-1", amountQ: 12345, dueDate: parseDate("2026-10-05")!, daysOverdue: 0,
    });
    expect(t).toBe("Nur: FT-1 123,45 ₼ 05.10.2026");
  });
});
