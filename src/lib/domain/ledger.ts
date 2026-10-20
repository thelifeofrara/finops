import type { AccountType } from "@prisma/client";

// The ledger is derived, not stored. Every posting below is balanced, so the trial
// balance always balances by construction:
//   invoice issued:          Dr 211 receivables  /  Cr 601 revenue (+ Cr 521 VAT)
//   payment matched:         Dr 223 bank         /  Cr 211 receivables
//   other money in:          Dr 223 bank         /  Cr <category>
//   money out:               Dr <category>       /  Cr 223 bank
// Uncategorised amounts go to 999 so nothing is lost before the owner picks a category.

export interface LedgerAccount {
  id: string;
  code: string;
  nameAz: string;
  nameEn: string;
  type: AccountType;
  system: string | null;
}

export interface LedgerInvoice {
  issueDate: Date;
  amountQ: number;
  vatQ: number;
  voided: boolean;
}

export interface LedgerTransaction {
  date: Date;
  amountQ: number;
  accountId: string | null;
  allocatedQ: number;
}

export interface Posting {
  accountId: string;
  debitQ: number;
  creditQ: number;
}

export interface TrialBalanceRow {
  account: LedgerAccount;
  debitQ: number;
  creditQ: number;
  /** Debit minus credit. */
  balanceQ: number;
}

function systemId(accounts: LedgerAccount[], system: string): string {
  const a = accounts.find((x) => x.system === system);
  if (!a) throw new Error(`Chart of accounts is missing the ${system} account`);
  return a.id;
}

export function postings(
  accounts: LedgerAccount[],
  invoices: LedgerInvoice[],
  transactions: LedgerTransaction[],
  range: { from?: Date; to?: Date } = {},
): Posting[] {
  const bank = systemId(accounts, "bank");
  const receivables = systemId(accounts, "receivables");
  const vat = systemId(accounts, "vat_payable");
  const revenue = systemId(accounts, "revenue");
  const suspense = systemId(accounts, "suspense");
  const inRange = (d: Date) => (!range.from || d >= range.from) && (!range.to || d <= range.to);
  const out: Posting[] = [];

  for (const inv of invoices) {
    if (inv.voided || !inRange(inv.issueDate)) continue;
    out.push({ accountId: receivables, debitQ: inv.amountQ, creditQ: 0 });
    out.push({ accountId: revenue, debitQ: 0, creditQ: inv.amountQ - inv.vatQ });
    if (inv.vatQ) out.push({ accountId: vat, debitQ: 0, creditQ: inv.vatQ });
  }

  for (const tx of transactions) {
    if (!inRange(tx.date) || tx.amountQ === 0) continue;
    if (tx.amountQ > 0) {
      const allocated = Math.min(tx.allocatedQ, tx.amountQ);
      const rest = tx.amountQ - allocated;
      out.push({ accountId: bank, debitQ: tx.amountQ, creditQ: 0 });
      if (allocated) out.push({ accountId: receivables, debitQ: 0, creditQ: allocated });
      if (rest) out.push({ accountId: tx.accountId ?? suspense, debitQ: 0, creditQ: rest });
    } else {
      const amount = -tx.amountQ;
      out.push({ accountId: tx.accountId ?? suspense, debitQ: amount, creditQ: 0 });
      out.push({ accountId: bank, debitQ: 0, creditQ: amount });
    }
  }
  return out;
}

export function trialBalance(accounts: LedgerAccount[], posts: Posting[]): TrialBalanceRow[] {
  const byId = new Map(accounts.map((a) => [a.id, { account: a, debitQ: 0, creditQ: 0, balanceQ: 0 }]));
  for (const p of posts) {
    const row = byId.get(p.accountId);
    if (!row) throw new Error(`Posting to unknown account ${p.accountId}`);
    row.debitQ += p.debitQ;
    row.creditQ += p.creditQ;
  }
  return [...byId.values()]
    .map((r) => ({ ...r, balanceQ: r.debitQ - r.creditQ }))
    .filter((r) => r.debitQ || r.creditQ)
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
}

export function profitAndLoss(rows: TrialBalanceRow[]) {
  const incomeQ = rows.filter((r) => r.account.type === "INCOME").reduce((s, r) => s - r.balanceQ, 0);
  const expenseQ = rows
    .filter((r) => r.account.type === "EXPENSE" && r.account.system !== "suspense")
    .reduce((s, r) => s + r.balanceQ, 0);
  // Suspense holds money not yet categorised. Shown as a positive amount, whether it is income or expense.
  const uncategorisedQ = Math.abs(rows.find((r) => r.account.system === "suspense")?.balanceQ ?? 0);
  return { incomeQ, expenseQ, profitQ: incomeQ - expenseQ, uncategorisedQ };
}
