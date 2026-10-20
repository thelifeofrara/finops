import { prisma } from "./prisma";
import { loadInvoices } from "./receivables";
import { normalizeParty, type LearnedRule } from "../domain/categorize";
import { postings, trialBalance, profitAndLoss, type LedgerAccount, type LedgerInvoice, type LedgerTransaction } from "../domain/ledger";

export async function loadAccounts(businessId: string): Promise<LedgerAccount[]> {
  return prisma.account.findMany({
    where: { businessId },
    orderBy: { code: "asc" },
    select: { id: true, code: true, nameAz: true, nameEn: true, type: true, system: true },
  });
}

export async function loadTransactions(businessId: string) {
  const rows = await prisma.bankTransaction.findMany({
    where: { businessId },
    include: { allocations: true, account: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({ ...r, allocatedQ: r.allocations.reduce((s, a) => s + a.amountQ, 0) }));
}

export async function learnedRules(businessId: string): Promise<LearnedRule[]> {
  const rules = await prisma.categoryRule.findMany({ where: { businessId }, include: { account: true } });
  return rules.map((r) => ({
    pattern: r.pattern,
    matchOn: r.matchOn,
    direction: r.direction,
    accountCode: r.account.code,
  }));
}

export async function customerIdentity(businessId: string) {
  const customers = await prisma.customer.findMany({ where: { businessId } });
  return {
    customerVoens: new Set(customers.map((c) => c.voen).filter((v): v is string => Boolean(v))),
    customerNames: new Set(customers.map((c) => normalizeParty(c.name))),
  };
}

export async function ledgerView(businessId: string) {
  const [accounts, invoices, transactions] = await Promise.all([
    loadAccounts(businessId),
    loadInvoices(businessId),
    loadTransactions(businessId),
  ]);
  const invoiceInput: LedgerInvoice[] = invoices.map((i) => ({
    issueDate: i.issueDate,
    amountQ: i.amountQ,
    vatQ: i.vatQ,
    voided: i.voided,
  }));
  const txInput: LedgerTransaction[] = transactions.map((t) => ({
    date: t.date,
    amountQ: t.amountQ,
    accountId: t.accountId,
    allocatedQ: t.allocatedQ,
  }));
  const rows = trialBalance(accounts, postings(accounts, invoiceInput, txInput));
  return { accounts, rows, pl: profitAndLoss(rows), transactions };
}

/** Sum of incoming money in a date range, used as the simplified-tax base. */
export async function receiptsBetween(businessId: string, from: Date, to: Date): Promise<number> {
  const agg = await prisma.bankTransaction.aggregate({
    where: { businessId, amountQ: { gt: 0 }, date: { gte: from, lte: to } },
    _sum: { amountQ: true },
  });
  return agg._sum.amountQ ?? 0;
}
