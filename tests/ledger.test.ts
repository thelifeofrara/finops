import { describe, expect, it } from "vitest";
import { DEFAULT_CHART } from "@/lib/domain/chart";
import { postings, profitAndLoss, trialBalance, type LedgerAccount } from "@/lib/domain/ledger";
import { parseDate } from "@/lib/domain/dates";

const accounts: LedgerAccount[] = DEFAULT_CHART.map((a, i) => ({ id: `a${i}`, code: a.code, nameAz: a.nameAz, nameEn: a.nameEn, type: a.type, system: a.system ?? null }));
const id = (system: string) => accounts.find((a) => a.system === system)!.id;

describe("ledger", () => {
  it("balances: every posting set has total debit equal to total credit", () => {
    const posts = postings(
      accounts,
      [{ issueDate: parseDate("2026-10-01")!, amountQ: 118000, vatQ: 18000, voided: false }],
      [
        { date: parseDate("2026-10-10")!, amountQ: 60000, accountId: null, allocatedQ: 60000 },
        { date: parseDate("2026-10-11")!, amountQ: -5000, accountId: id("suspense"), allocatedQ: 0 },
      ],
    );
    const dr = posts.reduce((s, p) => s + p.debitQ, 0);
    const cr = posts.reduce((s, p) => s + p.creditQ, 0);
    expect(dr).toBe(cr);
  });

  it("reports revenue, expenses and uncategorised amounts", () => {
    const posts = postings(
      accounts,
      [{ issueDate: parseDate("2026-10-01")!, amountQ: 100000, vatQ: 0, voided: false }],
      [{ date: parseDate("2026-10-11")!, amountQ: -5000, accountId: null, allocatedQ: 0 }],
    );
    const pl = profitAndLoss(trialBalance(accounts, posts));
    expect(pl.incomeQ).toBe(100000);
    expect(pl.uncategorisedQ).toBe(5000);
    expect(pl.expenseQ).toBe(0);
  });
});
