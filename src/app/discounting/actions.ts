"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/** Records that the owner wants an advance on an invoice. No money moves; this only measures demand. */
export async function expressInterest(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const invoiceId = String(formData.get("invoiceId"));
  const advanceQ = Number(formData.get("advanceQ"));
  const feeQ = Number(formData.get("feeQ"));
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, businessId: business.id } });
  if (!invoice || !Number.isInteger(advanceQ) || !Number.isInteger(feeQ) || advanceQ <= 0) throw new Error("Məlumat düzgün deyil.");
  await prisma.advanceInterest.create({ data: { invoiceId: invoice.id, advanceQ, feeQ } });
  revalidatePath("/discounting");
}
