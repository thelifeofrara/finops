"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { rememberCategory } from "@/lib/db/actions-shared";

export async function setCategory(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const txId = String(formData.get("transactionId"));
  const accountId = String(formData.get("accountId"));
  const learn = formData.get("learn") === "on";
  const tx = await prisma.bankTransaction.findFirst({ where: { id: txId, businessId: business.id } });
  const account = await prisma.account.findFirst({ where: { id: accountId, businessId: business.id } });
  if (!tx || !account) throw new Error("Əməliyyat və ya hesab tapılmadı.");

  await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: { accountId: account.id, categorySource: "MANUAL", categoryConfidence: 1 },
  });
  if (learn) await rememberCategory(business.id, tx.counterparty, tx.counterpartyVoen, account.id, tx.amountQ >= 0 ? "IN" : "OUT");
  revalidatePath("/ledger");
}
