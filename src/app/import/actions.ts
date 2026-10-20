"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { parseCsv, dedupeHash } from "@/lib/domain/bankStatement";
import { parseEqaime } from "@/lib/db/eqaime";
import { categoriseUncategorised } from "@/lib/db/categorise-import";
import { addDays } from "@/lib/domain/dates";

export async function importStatement(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Fayl seçilməyib.");
  const parsed = parseCsv(await file.text());
  if (parsed.error) throw new Error("Faylı oxumaq olmadı. Başlıq sətrini yoxlayın.");

  const statement = await prisma.bankStatement.create({ data: { businessId: business.id, fileName: file.name } });
  await prisma.bankTransaction.createMany({
    data: parsed.transactions.map((tx) => ({
      businessId: business.id,
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
  await categoriseUncategorised(business.id);
  revalidatePath("/import");
  revalidatePath("/payments");
  revalidatePath("/ledger");
}

export async function importEqaime(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Fayl seçilməyib.");
  const { invoices } = parseEqaime(await file.text());
  if (invoices.length === 0) throw new Error("XML-də hesab-faktura tapılmadı.");

  for (const inv of invoices) {
    const customer =
      (inv.customerVoen && (await prisma.customer.findFirst({ where: { businessId: business.id, voen: inv.customerVoen } }))) ||
      (await prisma.customer.findFirst({ where: { businessId: business.id, name: inv.customerName } })) ||
      (await prisma.customer.create({ data: { businessId: business.id, name: inv.customerName, voen: inv.customerVoen } }));
    await prisma.invoice.upsert({
      where: { businessId_number: { businessId: business.id, number: inv.number } },
      update: {},
      create: {
        businessId: business.id,
        customerId: customer.id,
        number: inv.number,
        issueDate: inv.issueDate,
        dueDate: addDays(inv.issueDate, customer.defaultTermsDays),
        amountQ: inv.amountQ,
        vatQ: inv.vatQ,
        source: "EQAIME",
      },
    });
  }
  revalidatePath("/invoices");
  revalidatePath("/");
}
