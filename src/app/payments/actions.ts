"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { rememberCategory } from "@/lib/db/actions-shared";
import { loadInvoices } from "@/lib/db/receivables";
import { outstanding } from "@/lib/domain/ageing";

export async function matchPayment(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const txId = String(formData.get("transactionId"));
  const invoiceId = String(formData.get("invoiceId"));
  const tx = await prisma.bankTransaction.findFirst({ where: { id: txId, businessId: business.id }, include: { allocations: true } });
  if (!tx) throw new Error("Əməliyyat tapılmadı.");
  const invoices = await loadInvoices(business.id);
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) throw new Error("Hesab-faktura tapılmadı.");

  const txLeft = tx.amountQ - tx.allocations.reduce((s, a) => s + a.amountQ, 0);
  const invLeft = outstanding({ id: inv.id, customerId: inv.customerId, dueDate: inv.dueDate, amountQ: inv.amountQ, paidQ: inv.paidQ, voided: inv.voided });
  const amountQ = Math.min(txLeft, invLeft);
  if (amountQ <= 0) throw new Error("Uyğunlaşdırmaq üçün məbləğ qalmayıb.");

  await prisma.paymentAllocation.create({ data: { transactionId: tx.id, invoiceId: inv.id, amountQ } });
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/ledger");
}

/** Chooses a category for a payment that does not settle an invoice, and remembers it for this counterparty. */
export async function categorisePayment(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const txId = String(formData.get("transactionId"));
  const accountId = String(formData.get("accountId"));
  const learn = formData.get("learn") === "on";
  const tx = await prisma.bankTransaction.findFirst({ where: { id: txId, businessId: business.id } });
  if (!tx) throw new Error("Əməliyyat tapılmadı.");
  const account = await prisma.account.findFirst({ where: { id: accountId, businessId: business.id } });
  if (!account) throw new Error("Hesab tapılmadı.");

  await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: { accountId: account.id, categorySource: "MANUAL", categoryConfidence: 1 },
  });
  if (learn) await rememberCategory(business.id, tx.counterparty, tx.counterpartyVoen, account.id, tx.amountQ >= 0 ? "IN" : "OUT");
  revalidatePath("/payments");
  revalidatePath("/ledger");
}
