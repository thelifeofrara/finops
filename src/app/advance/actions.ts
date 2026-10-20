"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { debtorScores } from "@/lib/db/debtors";
import { quoteAdvance } from "@/lib/domain/advance";
import { today } from "@/lib/domain/dates";
import { requireBusiness } from "@/lib/session";

/** Records demand for an advance on one invoice. The quote is recomputed here, not trusted from the form. */
export async function registerInterest(formData: FormData) {
  const biz = await requireBusiness();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, businessId: biz.id, voidedAt: null }, include: { allocations: true } });
  if (!inv) redirect("/advance");
  const asOf = today();
  const score = (await debtorScores(biz.id, asOf)).get(inv.customerId);
  const quote = quoteAdvance({
    outstandingQ: inv.amountQ - inv.allocations.reduce((s, a) => s + a.amountQ, 0),
    dueDate: inv.dueDate,
    asOf,
    grade: score?.grade ?? "new",
    avgDaysLate: score?.avgDaysLate ?? 0,
  });
  if (quote.eligible && !(await prisma.advanceInterest.findFirst({ where: { invoiceId: inv.id } }))) {
    await prisma.advanceInterest.create({ data: { invoiceId: inv.id, advanceQ: quote.advanceQ, feeQ: quote.feeQ } });
  }
  revalidatePath("/advance");
  redirect("/advance");
}
