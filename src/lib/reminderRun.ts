import { prisma } from "./db/prisma";
import { loadInvoices } from "./db/receivables";
import { decideReminder, STAGES, renderTemplate } from "./domain/reminders";
import { outstanding, daysOverdue } from "./domain/ageing";
import { today } from "./domain/dates";
import { mailer } from "./mail";

export interface RunSummary {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Sends at most one reminder per open invoice. Idempotent: each stage is logged once per invoice,
 * so running the worker twice on the same day never sends a duplicate.
 */
export async function runReminders(asOf = today(), send = true): Promise<RunSummary> {
  const summary: RunSummary = { sent: 0, skipped: 0, failed: 0 };
  const businesses = await prisma.business.findMany({ include: { templates: true } });

  for (const biz of businesses) {
    const templates = new Map(biz.templates.map((t) => [t.stage, t]));
    const invoices = await loadInvoices(biz.id);
    for (const inv of invoices) {
      const due = outstanding({ id: inv.id, customerId: inv.customerId, dueDate: inv.dueDate, amountQ: inv.amountQ, paidQ: inv.paidQ, voided: inv.voided });
      if (due <= 0 || !inv.remindersEnabled || inv.customer.remindersPaused) continue;

      const logs = await prisma.reminderLog.findMany({ where: { invoiceId: inv.id } });
      const handled = new Set(logs.map((l) => l.stage));
      const enabled = new Set(STAGES.filter((s) => templates.get(s)?.enabled ?? true));
      const decision = decideReminder(inv.dueDate, asOf, handled, enabled);

      for (const stage of decision.skip) {
        await prisma.reminderLog.create({ data: { invoiceId: inv.id, stage, status: "SKIPPED" } });
        summary.skipped++;
      }
      if (!decision.send) continue;

      const tpl = templates.get(decision.send);
      const vars = {
        customer: inv.customer.name,
        business: biz.name,
        number: inv.number,
        amountQ: due,
        dueDate: inv.dueDate,
        daysOverdue: daysOverdue(inv.dueDate, asOf),
      };
      const to = inv.customer.email;
      if (!to) {
        await prisma.reminderLog.create({ data: { invoiceId: inv.id, stage: decision.send, status: "SKIPPED", error: "no email" } });
        summary.skipped++;
        continue;
      }
      try {
        if (send) {
          await mailer().sendMail({
            from: { name: biz.name, address: process.env.MAIL_FROM ?? biz.replyToEmail },
            replyTo: biz.replyToEmail,
            to,
            subject: renderTemplate(tpl?.subject ?? "", vars),
            text: renderTemplate(tpl?.body ?? "", vars),
          });
        }
        await prisma.reminderLog.create({ data: { invoiceId: inv.id, stage: decision.send, toEmail: to, status: "SENT" } });
        summary.sent++;
      } catch (e) {
        // Logged as FAILED, not retried silently: the owner sees it on the invoice.
        await prisma.reminderLog.create({
          data: { invoiceId: inv.id, stage: decision.send, toEmail: to, status: "FAILED", error: String(e).slice(0, 500) },
        });
        summary.failed++;
      }
    }
  }
  return summary;
}
