"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { addDays, parseDate, today } from "@/lib/domain/dates";
import { parseMoney } from "@/lib/domain/money";
import { isEmail, normalizeEmail } from "@/lib/domain/auth";
import { requireBusiness } from "@/lib/session";

export async function createInvoice(formData: FormData) {
  const biz = await requireBusiness();
  const customerName = String(formData.get("customer") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const amountQ = parseMoney(String(formData.get("amount") ?? ""));
  const issueDate = parseDate(String(formData.get("issueDate") ?? "")) ?? today();
  const termsDays = Math.min(365, Math.max(0, Number(formData.get("termsDays") ?? 30) || 30));
  const vatQ = parseMoney(String(formData.get("vat") ?? "")) ?? 0;
  const emailRaw = normalizeEmail(String(formData.get("email") ?? ""));

  if (!customerName || !number || amountQ === null || amountQ <= 0) redirect("/invoices?err=required");
  if (vatQ < 0 || vatQ >= amountQ) redirect("/invoices?err=vat");
  if (await prisma.invoice.findUnique({ where: { businessId_number: { businessId: biz.id, number } } })) redirect("/invoices?err=duplicate");

  let customer =
    (await prisma.customer.findFirst({ where: { businessId: biz.id, name: customerName } })) ??
    (await prisma.customer.create({ data: { businessId: biz.id, name: customerName, defaultTermsDays: termsDays } }));
  if (emailRaw && isEmail(emailRaw) && customer.email !== emailRaw) {
    customer = await prisma.customer.update({ where: { id: customer.id }, data: { email: emailRaw } });
  }

  await prisma.invoice.create({
    data: { businessId: biz.id, customerId: customer.id, number, issueDate, dueDate: addDays(issueDate, termsDays), amountQ, vatQ },
  });
  revalidatePath("/", "layout");
  redirect("/invoices?ok=created");
}

async function ownInvoice(formData: FormData) {
  const biz = await requireBusiness();
  const id = String(formData.get("id") ?? "");
  const invoice = await prisma.invoice.findFirst({ where: { id, businessId: biz.id }, include: { allocations: true, customer: true } });
  if (!invoice) redirect("/invoices");
  return invoice;
}

export async function setInvoiceReminders(formData: FormData) {
  const inv = await ownInvoice(formData);
  await prisma.invoice.update({ where: { id: inv.id }, data: { remindersEnabled: formData.get("enabled") === "1" } });
  redirect(`/invoices/${inv.id}`);
}

export async function voidInvoice(formData: FormData) {
  const inv = await ownInvoice(formData);
  if (inv.allocations.length) redirect(`/invoices/${inv.id}?err=void`);
  await prisma.invoice.update({ where: { id: inv.id }, data: { voidedAt: new Date() } });
  revalidatePath("/", "layout");
  redirect(`/invoices/${inv.id}`);
}

export async function updateCustomer(formData: FormData) {
  const inv = await ownInvoice(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const paused = formData.get("paused");
  await prisma.customer.update({
    where: { id: inv.customerId },
    data: {
      ...(formData.has("email") ? { email: email && isEmail(email) ? email : null } : {}),
      ...(paused === "1" || paused === "0" ? { remindersPaused: paused === "1" } : {}),
    },
  });
  redirect(`/invoices/${inv.id}`);
}
