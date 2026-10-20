import { prisma } from "./prisma";
import { daysOverdue } from "../domain/ageing";
import { scoreDebtor, type DebtorScore, type PaidInvoiceHistory } from "../domain/scoring";

/** Debtor score per customer, from fully paid invoices (paid date = last matched payment). */
export async function debtorScores(businessId: string, asOf: Date): Promise<Map<string, DebtorScore>> {
  const invoices = await prisma.invoice.findMany({
    where: { businessId, voidedAt: null },
    include: { allocations: { include: { transaction: { select: { date: true } } } } },
  });
  const history = new Map<string, PaidInvoiceHistory[]>();
  const seriouslyLate = new Map<string, number>();
  for (const inv of invoices) {
    const paidQ = inv.allocations.reduce((s, a) => s + a.amountQ, 0);
    if (paidQ >= inv.amountQ && inv.allocations.length) {
      const paidDate = inv.allocations.reduce((d, a) => (a.transaction.date > d ? a.transaction.date : d), inv.allocations[0].transaction.date);
      history.set(inv.customerId, [...(history.get(inv.customerId) ?? []), { dueDate: inv.dueDate, paidDate }]);
    } else if (daysOverdue(inv.dueDate, asOf) > 60) {
      seriouslyLate.set(inv.customerId, (seriouslyLate.get(inv.customerId) ?? 0) + 1);
    }
  }
  const ids = new Set(invoices.map((i) => i.customerId));
  return new Map([...ids].map((id) => [id, scoreDebtor(history.get(id) ?? [], seriouslyLate.get(id) ?? 0)]));
}
