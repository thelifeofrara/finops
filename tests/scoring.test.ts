import { describe, expect, it } from "vitest";
import { scoreDebtor } from "@/lib/domain/scoring";
import { parseDate } from "@/lib/domain/dates";

const pay = (due: string, paid: string) => ({ dueDate: parseDate(due)!, paidDate: parseDate(paid)! });

describe("scoreDebtor", () => {
  it("grades reliable payers A", () => {
    const s = scoreDebtor([pay("2026-01-10", "2026-01-09"), pay("2026-02-10", "2026-02-11"), pay("2026-03-10", "2026-03-10")]);
    expect(s.grade).toBe("A");
  });
  it("grades a debtor with a seriously late open invoice D", () => {
    expect(scoreDebtor([pay("2026-01-10", "2026-01-10")], 1).grade).toBe("D");
  });
  it("returns new for no history", () => {
    expect(scoreDebtor([]).grade).toBe("new");
  });
});
