import { prisma } from "./prisma";
import { ageingSummary, outstanding, type InvoiceForAgeing } from "../domain/ageing";
import { today } from "../domain/dates";

/** Every invoice with its paid amount, mapped for the domain functions. */
export async function loadInvoices(businessId: string) {
  const rows = await prisma.invoice.findMany({
    where: { businessId },
    include: { customer: true, allocations: true },
    orderBy: { dueDate: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    paidQ: r.allocations.reduce((s, a) => s + a.amountQ, 0),
    voided: r.voidedAt !== null,
  }));
}

export async function receivablesView(businessId: string, asOf = today()) {
  const invoices = await loadInvoices(businessId);
  const forAgeing: InvoiceForAgeing[] = invoices.map((i) => ({
    id: i.id,
    customerId: i.customerId,
    dueDate: i.dueDate,
    amountQ: i.amountQ,
    paidQ: i.paidQ,
    voided: i.voided,
  }));
  const summary = ageingSummary(forAgeing, asOf);
  const open = invoices
    .filter((i) => outstanding({ ...i, dueDate: i.dueDate, paidQ: i.paidQ, voided: i.voided }) > 0)
    .map((i) => ({ ...i, outstandingQ: outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }) }));
  return { summary, invoices, open, asOf };
}
