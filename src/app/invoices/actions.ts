"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { addDays, parseDate } from "@/lib/domain/dates";
import { parseMoney } from "@/lib/domain/money";
import { msg } from "@/lib/i18n";

export async function createInvoice(formData: FormData) {
  const { business: biz } = await requireBusiness();
  const customerName = String(formData.get("customer") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const amountQ = parseMoney(String(formData.get("amount") ?? ""));
  const issueDate = parseDate(String(formData.get("issueDate") ?? "")) ?? parseDate(new Date())!;
  const termsDays = Number(formData.get("termsDays") ?? 30);
  const vatQ = parseMoney(String(formData.get("vat") ?? "")) ?? 0;

  if (!customerName || !number || amountQ === null || amountQ <= 0) {
    throw new Error(msg("err_required"));
  }
  if (vatQ < 0 || vatQ > amountQ) throw new Error(msg("err_vat"));

  const customer =
    (await prisma.customer.findFirst({ where: { businessId: biz.id, name: customerName } })) ??
    (await prisma.customer.create({ data: { businessId: biz.id, name: customerName, defaultTermsDays: termsDays } }));

  await prisma.invoice.create({
    data: {
      businessId: biz.id,
      customerId: customer.id,
      number,
      issueDate,
      dueDate: addDays(issueDate, termsDays),
      amountQ,
      vatQ,
    },
  });
  revalidatePath("/invoices");
  revalidatePath("/");
}
