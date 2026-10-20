"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { autoCategorise } from "@/lib/db/bank";
import { parseCsv, dedupeHash } from "@/lib/domain/bankStatement";
import { parseEqaimeXml } from "@/lib/domain/eqaime";
import { addDays } from "@/lib/domain/dates";
import { requireBusiness } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;

async function readFile(formData: FormData): Promise<{ name: string; text: string } | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) return null;
  return { name: file.name, text: await file.text() };
}

export async function importStatement(formData: FormData): Promise<void> {
  const biz = await requireBusiness();
  const file = await readFile(formData);
  if (!file) redirect("/import?err=no_file");
  const parsed = parseCsv(file.text);
  if (parsed.error) redirect("/import?err=csv");

  const statement = await prisma.bankStatement.create({ data: { businessId: biz.id, fileName: file.name } });
  const created = await prisma.bankTransaction.createMany({
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
  const added = await prisma.bankTransaction.findMany({ where: { statementId: statement.id }, select: { id: true } });
  await autoCategorise(biz.id, added.map((t) => t.id));

  revalidatePath("/", "layout");
  const q = new URLSearchParams({
    ok: "bank",
    added: String(created.count),
    dupes: String(parsed.transactions.length - created.count),
    skipped: String(parsed.skippedRows),
  });
  redirect(`/import?${q}`);
}

export async function importEqaime(formData: FormData): Promise<void> {
  const biz = await requireBusiness();
  const file = await readFile(formData);
  if (!file) redirect("/import?err=no_file");
  const parsed = parseEqaimeXml(file.text);
  if (parsed.error === "invalid_xml") redirect("/import?err=xml");
  if (parsed.error === "no_invoices") redirect("/import?err=no_invoices");

  let created = 0;
  let duplicates = 0;
  let incoming = 0;
  for (const p of parsed.invoices) {
    // Purchase invoices (we are the buyer, or someone else is the seller) are not receivables.
    if ((biz.voen && p.buyerVoen === biz.voen) || (biz.voen && p.sellerVoen && p.sellerVoen !== biz.voen)) {
      incoming++;
      continue;
    }
    if (await prisma.invoice.findUnique({ where: { businessId_number: { businessId: biz.id, number: p.number } } })) {
      duplicates++;
      continue;
    }
    const name = p.buyerName ?? p.buyerVoen ?? "—";
    const customer =
      (p.buyerVoen && (await prisma.customer.findUnique({ where: { businessId_voen: { businessId: biz.id, voen: p.buyerVoen } } }))) ||
      (await prisma.customer.findFirst({ where: { businessId: biz.id, name } })) ||
      (await prisma.customer.create({ data: { businessId: biz.id, name, voen: p.buyerVoen } }));
    await prisma.invoice.create({
      data: {
        businessId: biz.id,
        customerId: customer.id,
        number: p.number,
        issueDate: p.issueDate,
        dueDate: addDays(p.issueDate, customer.defaultTermsDays),
        amountQ: p.amountQ,
        vatQ: p.vatQ,
        description: p.description,
        source: "EQAIME",
      },
    });
    created++;
  }
  revalidatePath("/", "layout");
  const q = new URLSearchParams({
    ok: "eqaime",
    created: String(created),
    duplicates: String(duplicates),
    incoming: String(incoming),
    skipped: String(parsed.skipped),
  });
  redirect(`/import?${q}`);
}
