import { prisma } from "./prisma";
import { outstanding } from "../domain/ageing";
import { categorize, normalizeParty, type LearnedRule } from "../domain/categorize";
import type { OpenInvoice } from "../domain/matching";
import { loadInvoices } from "./receivables";

/** Bank transactions with how much of each is already matched to invoices. */
export async function loadTransactions(businessId: string, where: { from?: Date; to?: Date } = {}) {
  const rows = await prisma.bankTransaction.findMany({
    where: { businessId, date: { gte: where.from, lte: where.to } },
    include: { allocations: { include: { invoice: { select: { id: true, number: true } } } }, account: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => {
    const allocatedQ = r.allocations.reduce((s, a) => s + a.amountQ, 0);
    return { ...r, allocatedQ, unallocatedQ: r.amountQ > 0 ? r.amountQ - allocatedQ : 0 };
  });
}

export async function openInvoicesForMatching(businessId: string): Promise<OpenInvoice[]> {
  const invoices = await loadInvoices(businessId);
  return invoices
    .map((i) => ({
      id: i.id,
      number: i.number,
      issueDate: i.issueDate,
      outstandingQ: outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }),
      customerName: i.customer.name,
      customerVoen: i.customer.voen,
    }))
    .filter((i) => i.outstandingQ > 0);
}

type TxRow = Awaited<ReturnType<typeof loadTransactions>>[number];

/**
 * An incoming payment with an unmatched part, unless the owner already booked that part
 * somewhere on purpose (a manual category, or owner's capital).
 */
export const needsMatching = (t: TxRow) =>
  t.unallocatedQ > 0 && t.categorySource !== "MANUAL" && t.account?.system !== "owner_equity";

export async function countUnmatched(businessId: string): Promise<number> {
  return (await loadTransactions(businessId)).filter(needsMatching).length;
}

/**
 * Applies learned rules, known customers and keyword rules to transactions that have no
 * category yet. A category the owner picked is never overwritten.
 */
export async function autoCategorise(businessId: string, onlyIds?: string[]) {
  const [accounts, rules, customers, txs] = await Promise.all([
    prisma.account.findMany({ where: { businessId } }),
    prisma.categoryRule.findMany({ where: { businessId }, include: { account: true } }),
    prisma.customer.findMany({ where: { businessId }, select: { voen: true, name: true } }),
    prisma.bankTransaction.findMany({ where: { businessId, accountId: null, ...(onlyIds ? { id: { in: onlyIds } } : {}) } }),
  ]);
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));
  const learned: LearnedRule[] = rules.map((r) => ({ pattern: r.pattern, matchOn: r.matchOn, direction: r.direction, accountCode: r.account.code }));
  const ctx = {
    learned,
    customerVoens: new Set(customers.map((c) => c.voen).filter((v): v is string => !!v)),
    customerNames: new Set(customers.map((c) => normalizeParty(c.name))),
  };
  let updated = 0;
  for (const tx of txs) {
    const c = categorize(tx, ctx);
    const accountId = c && byCode.get(c.accountCode);
    if (!c || !accountId) continue;
    await prisma.bankTransaction.update({ where: { id: tx.id }, data: { accountId, categoryConfidence: c.confidence, categorySource: c.source } });
    updated++;
  }
  return updated;
}
