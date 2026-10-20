"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { normalizeParty } from "@/lib/domain/categorize";
import { requireBusiness } from "@/lib/session";

/** Matches as much of a payment as fits the invoice's outstanding amount. */
export async function matchPayment(formData: FormData) {
  const biz = await requireBusiness();
  const transactionId = String(formData.get("transactionId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const ok = await prisma.$transaction(async (db) => {
    const tx = await db.bankTransaction.findFirst({ where: { id: transactionId, businessId: biz.id }, include: { allocations: true } });
    const inv = await db.invoice.findFirst({ where: { id: invoiceId, businessId: biz.id, voidedAt: null }, include: { allocations: true } });
    if (!tx || !inv || tx.amountQ <= 0) return false;
    const txLeft = tx.amountQ - tx.allocations.reduce((s, a) => s + a.amountQ, 0);
    const invLeft = inv.amountQ - inv.allocations.reduce((s, a) => s + a.amountQ, 0);
    const amountQ = Math.min(txLeft, invLeft);
    if (amountQ <= 0) return false;
    await db.paymentAllocation.upsert({
      where: { transactionId_invoiceId: { transactionId, invoiceId } },
      update: { amountQ: { increment: amountQ } },
      create: { transactionId, invoiceId, amountQ },
    });
    return true;
  });
  revalidatePath("/", "layout");
  redirect(ok ? "/payments?ok=matched" : "/payments?err=match");
}

export async function unmatchPayment(formData: FormData) {
  const biz = await requireBusiness();
  const id = String(formData.get("allocationId") ?? "");
  await prisma.paymentAllocation.deleteMany({ where: { id, transaction: { businessId: biz.id } } });
  revalidatePath("/", "layout");
  redirect("/payments");
}

/**
 * Sets the category for the unmatched part of a transaction and remembers it for the same
 * counterparty, so the next statement is categorised the same way.
 */
export async function setCategory(formData: FormData) {
  const biz = await requireBusiness();
  const transactionId = String(formData.get("transactionId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const tx = await prisma.bankTransaction.findFirst({ where: { id: transactionId, businessId: biz.id } });
  const account = accountId ? await prisma.account.findFirst({ where: { id: accountId, businessId: biz.id } }) : null;
  if (!tx) redirect("/payments");

  await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: account
      ? { accountId: account.id, categorySource: "MANUAL", categoryConfidence: 1 }
      : { accountId: null, categorySource: null, categoryConfidence: null },
  });

  if (account && (tx.counterparty || tx.counterpartyVoen)) {
    const direction = tx.amountQ > 0 ? "IN" : "OUT";
    const rule = tx.counterparty
      ? { matchOn: "counterparty", pattern: normalizeParty(tx.counterparty) }
      : { matchOn: "voen", pattern: tx.counterpartyVoen! };
    await prisma.categoryRule.upsert({
      where: { businessId_matchOn_pattern_direction: { businessId: biz.id, ...rule, direction } },
      update: { accountId: account.id },
      create: { businessId: biz.id, ...rule, direction, accountId: account.id },
    });
    // Apply to the same counterparty's other transactions, except ones the owner set by hand.
    const others = await prisma.bankTransaction.findMany({
      where: {
        businessId: biz.id,
        id: { not: tx.id },
        amountQ: direction === "IN" ? { gt: 0 } : { lt: 0 },
        OR: [{ categorySource: null }, { categorySource: { not: "MANUAL" } }],
      },
    });
    const same = others.filter((o) =>
      rule.matchOn === "counterparty" ? o.counterparty && normalizeParty(o.counterparty) === rule.pattern : o.counterpartyVoen === rule.pattern,
    );
    if (same.length) {
      await prisma.bankTransaction.updateMany({
        where: { id: { in: same.map((o) => o.id) } },
        data: { accountId: account.id, categorySource: "LEARNED", categoryConfidence: 0.95 },
      });
    }
  }
  revalidatePath("/", "layout");
  redirect("/payments#categories");
}
