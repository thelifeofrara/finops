import { prisma } from "./prisma";
import { postings, profitAndLoss, trialBalance } from "../domain/ledger";
import { loadTransactions } from "./bank";

export async function ledgerView(businessId: string, range: { from: Date; to: Date }) {
  const [accounts, invoices, txs] = await Promise.all([
    prisma.account.findMany({ where: { businessId } }),
    prisma.invoice.findMany({ where: { businessId }, select: { issueDate: true, amountQ: true, vatQ: true, voidedAt: true } }),
    loadTransactions(businessId, range),
  ]);
  const posts = postings(
    accounts,
    invoices.map((i) => ({ issueDate: i.issueDate, amountQ: i.amountQ, vatQ: i.vatQ, voided: i.voidedAt !== null })),
    txs.map((t) => ({ date: t.date, amountQ: t.amountQ, accountId: t.accountId, allocatedQ: t.allocatedQ })),
    range,
  );
  const rows = trialBalance(accounts, posts);
  const debitQ = rows.reduce((s, r) => s + r.debitQ, 0);
  const creditQ = rows.reduce((s, r) => s + r.creditQ, 0);
  return { rows, debitQ, creditQ, pnl: profitAndLoss(rows) };
}
