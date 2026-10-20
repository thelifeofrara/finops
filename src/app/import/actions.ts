"use server";

import { revalidatePath } from "next/cache";
import { currentBusiness } from "@/lib/db/business";
import { prisma } from "@/lib/db/prisma";
import { parseCsv, dedupeHash } from "@/lib/domain/bankStatement";

export async function importStatement(formData: FormData): Promise<void> {
  const biz = await currentBusiness();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Fayl seçilməyib.");
  const parsed = parseCsv(await file.text());
  if (parsed.error) throw new Error(`Faylı oxumaq olmadı (${parsed.error}). Başlıq sətrini yoxlayın.`);

  const statement = await prisma.bankStatement.create({ data: { businessId: biz.id, fileName: file.name } });
  await prisma.bankTransaction.createMany({
    data: parsed.transactions.map((tx) => ({
      businessId: biz.id,
      statementId: statement.id,
      date: tx.date,
      amountQ: tx.amountQ,
      description: tx.description,
      counterparty: tx.counterparty,
      counterpartyVoen: tx.counterpartyVoen,
      dedupeHash: dedupeHash(tx),
    })),
    skipDuplicates: true,
  });
  revalidatePath("/import");
}
