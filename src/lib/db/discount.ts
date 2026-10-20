import { prisma } from "./prisma";
import { loadInvoices } from "./receivables";
import { outstanding } from "../domain/ageing";
import { quoteAdvance, type AdvanceQuote, type IneligibleReason } from "../domain/advance";
import { scoreDebtor, type DebtorScore } from "../domain/scoring";
import { daysBetween, today } from "../domain/dates";

export interface AdvanceRow {
  id: string;
  number: string;
  customerName: string;
  dueDate: Date;
  outstandingQ: number;
  score: DebtorScore;
  quote: AdvanceQuote | { eligible: false; reason: IneligibleReason };
}

export async function advanceView(businessId: string, asOf = today()): Promise<AdvanceRow[]> {
  const invoices = await loadInvoices(businessId);
  const rows: AdvanceRow[] = [];
  for (const inv of invoices) {
    const due = outstanding({ id: inv.id, customerId: inv.customerId, dueDate: inv.dueDate, amountQ: inv.amountQ, paidQ: inv.paidQ, voided: inv.voided });
    if (due <= 0) continue;

    // Payment history with this customer: invoices fully paid, with the date of their last payment.
    const paid = invoices.filter((i) => i.customerId === inv.customerId && i.paidQ >= i.amountQ && i.allocations.length > 0);
    const history = await Promise.all(
      paid.map(async (p) => {
        const last = await prisma.paymentAllocation.findFirst({
          where: { invoiceId: p.id },
          orderBy: { createdAt: "desc" },
          include: { transaction: true },
        });
        return { dueDate: p.dueDate, paidDate: last?.transaction.date ?? p.dueDate };
      }),
    );
    const seriouslyLateOpen = invoices.filter(
      (i) => i.customerId === inv.customerId && outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }) > 0 && daysBetween(i.dueDate, asOf) > 60,
    ).length;
    const score = scoreDebtor(history, seriouslyLateOpen);
    const quote = quoteAdvance({ outstandingQ: due, dueDate: inv.dueDate, asOf, grade: score.grade, avgDaysLate: score.avgDaysLate });
    rows.push({ id: inv.id, number: inv.number, customerName: inv.customer.name, dueDate: inv.dueDate, outstandingQ: due, score, quote });
  }
  return rows;
}
