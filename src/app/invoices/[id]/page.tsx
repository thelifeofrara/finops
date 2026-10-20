import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/Flash";
import { prisma } from "@/lib/db/prisma";
import { invoiceStatus, outstanding } from "@/lib/domain/ageing";
import { formatMoney } from "@/lib/domain/money";
import { isoDate, today } from "@/lib/domain/dates";
import { decideReminder, limitationEnds, nextReminderDate, STAGES } from "@/lib/domain/reminders";
import { getDict, requireBusiness } from "@/lib/session";
import { setInvoiceReminders, updateCustomer, voidInvoice } from "../actions";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const biz = await requireBusiness();
  const [{ id }, { err }, { l }] = await Promise.all([params, searchParams, getDict()]);
  const inv = await prisma.invoice.findFirst({
    where: { id, businessId: biz.id },
    include: {
      customer: true,
      allocations: { include: { transaction: true }, orderBy: { createdAt: "asc" } },
      reminders: { orderBy: { sentAt: "desc" } },
    },
  });
  if (!inv) notFound();

  const t = l.invoices;
  const asOf = today();
  const paidQ = inv.allocations.reduce((s, a) => s + a.amountQ, 0);
  const forAgeing = { id: inv.id, customerId: inv.customerId, dueDate: inv.dueDate, amountQ: inv.amountQ, paidQ, voided: inv.voidedAt !== null };
  const status = invoiceStatus(forAgeing, asOf);
  const open = outstanding(forAgeing) > 0;
  const handled = new Set(inv.reminders.map((r) => r.stage));
  // A stage whose day has passed but was not handled yet goes out on the worker's next run.
  const dueNow = open ? decideReminder(inv.dueDate, asOf, handled, new Set(STAGES)).send : null;
  const next = dueNow ? { stage: dueNow, date: asOf } : open ? nextReminderDate(inv.dueDate, asOf, handled) : null;

  return (
    <>
      <p><Link href="/invoices">← {l.common.back}</Link></p>
      <h1>{inv.number} · {inv.customer.name}</h1>
      <Flash err={err === "void" ? t.voidBlocked : null} />
      <dl className="facts">
        <dt>{l.common.status}</dt><dd className={status === "overdue" ? "overdue" : undefined}>{l.enums.invoiceStatus[status]}</dd>
        <dt>{t.issued}</dt><dd>{isoDate(inv.issueDate)}</dd>
        <dt>{t.due}</dt><dd>{isoDate(inv.dueDate)}</dd>
        <dt>{l.common.amount}</dt><dd>{formatMoney(inv.amountQ)}</dd>
        <dt>{t.vat}</dt><dd>{formatMoney(inv.vatQ)}</dd>
        <dt>{t.paid}</dt><dd>{formatMoney(paidQ)}</dd>
        <dt>{t.outstanding}</dt><dd>{formatMoney(outstanding(forAgeing))}</dd>
        <dt>{t.source}</dt><dd>{l.enums.source[inv.source]}</dd>
        <dt>{t.limitation}</dt><dd>{isoDate(limitationEnds(inv.dueDate))}</dd>
      </dl>
      {inv.description && <p>{inv.description}</p>}

      <h2>{t.payments}</h2>
      {inv.allocations.length === 0 ? (
        <p className="muted">{t.noPayments}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{l.common.date}</th><th>{l.common.description}</th><th className="num">{l.common.amount}</th></tr></thead>
            <tbody>
              {inv.allocations.map((a) => (
                <tr key={a.id}><td>{isoDate(a.transaction.date)}</td><td>{a.transaction.description}</td><td className="num">{formatMoney(a.amountQ)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>{t.reminders}</h2>
      {!inv.customer.email && open && <p className="flash error">{t.noEmail}</p>}
      {inv.customer.remindersPaused && <p className="muted">{t.customerPaused}</p>}
      {!inv.remindersEnabled && <p className="muted">{t.remindersOff}</p>}
      {open && (
        <p>
          {t.nextReminder}: {next && inv.remindersEnabled && !inv.customer.remindersPaused ? `${isoDate(next.date)} (${l.enums.stage[next.stage]})` : t.noNextReminder}
        </p>
      )}
      {inv.reminders.length === 0 ? (
        <p className="muted">{t.noReminders}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{l.common.date}</th><th>{l.common.status}</th><th>{t.sentTo}</th><th></th></tr></thead>
            <tbody>
              {inv.reminders.map((r) => (
                <tr key={r.id}>
                  <td>{isoDate(r.sentAt)}</td>
                  <td className={r.status === "FAILED" ? "overdue" : undefined}>{l.enums.stage[r.stage]}: {l.enums.reminderStatus[r.status]}</td>
                  <td>{r.toEmail ?? "—"}</td>
                  <td className="muted">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row-actions">
        {status !== "void" && (
          <form action={setInvoiceReminders}>
            <input type="hidden" name="id" value={inv.id} />
            <input type="hidden" name="enabled" value={inv.remindersEnabled ? "0" : "1"} />
            <button className="secondary">{inv.remindersEnabled ? t.disableReminders : t.enableReminders}</button>
          </form>
        )}
        <form action={updateCustomer}>
          <input type="hidden" name="id" value={inv.id} />
          <input type="hidden" name="paused" value={inv.customer.remindersPaused ? "0" : "1"} />
          <button className="secondary">{inv.customer.remindersPaused ? t.resumeCustomer : t.pauseCustomer}</button>
        </form>
        {status !== "void" && paidQ === 0 && (
          <form action={voidInvoice}>
            <input type="hidden" name="id" value={inv.id} />
            <button className="danger">{t.void}</button>
          </form>
        )}
      </div>

      <form action={updateCustomer} className="stack" style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={inv.id} />
        <label>{t.customerEmail}<input name="email" type="email" defaultValue={inv.customer.email ?? ""} /></label>
        <button type="submit">{l.common.save}</button>
      </form>
    </>
  );
}
