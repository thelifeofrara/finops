import Link from "next/link";
import { Flash } from "@/components/Flash";
import { loadInvoices } from "@/lib/db/receivables";
import { invoiceStatus, outstanding } from "@/lib/domain/ageing";
import { formatMoney } from "@/lib/domain/money";
import { isoDate, today } from "@/lib/domain/dates";
import { getDict, requireBusiness } from "@/lib/session";
import { createInvoice } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const biz = await requireBusiness();
  const [invoices, { l }, { ok, err }] = await Promise.all([loadInvoices(biz.id), getDict(), searchParams]);
  const asOf = today();
  const t = l.invoices;
  const errors: Record<string, string> = { required: t.errRequired, vat: t.errVat, duplicate: t.errDuplicate };

  return (
    <>
      <h1>{t.title}</h1>
      <Flash ok={ok ? t.created : null} err={err ? (errors[err] ?? null) : null} />
      <details open={invoices.length === 0 || !!err}>
        <summary>{t.new}</summary>
        <form action={createInvoice} className="stack" style={{ marginTop: 12 }}>
          <input name="customer" placeholder={t.customerPh} required />
          <input name="email" type="email" placeholder={t.emailPh} />
          <input name="number" placeholder={t.numberPh} required />
          <input name="amount" placeholder={t.amountPh} inputMode="decimal" required />
          <input name="vat" placeholder={t.vatPh} inputMode="decimal" />
          <input name="issueDate" type="date" defaultValue={isoDate(asOf)} />
          <label>
            {t.terms}
            <select name="termsDays" defaultValue="30">
              {[7, 14, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} {l.common.days}</option>)}
            </select>
          </label>
          <button type="submit">{l.common.save}</button>
        </form>
      </details>

      <h2>{t.list}</h2>
      {invoices.length === 0 ? (
        <p className="muted">{l.receivables.noInvoices}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>{l.common.number}</th><th>{l.common.customer}</th><th>{t.due}</th><th className="num">{l.common.amount}</th><th className="num">{t.outstanding}</th><th>{l.common.status}</th></tr>
            </thead>
            <tbody>
              {invoices.map((i) => {
                const inv = { id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided };
                const status = invoiceStatus(inv, asOf);
                return (
                  <tr key={i.id}>
                    <td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td>
                    <td>{i.customer.name}</td>
                    <td>{isoDate(i.dueDate)}</td>
                    <td className="num">{formatMoney(i.amountQ)}</td>
                    <td className="num">{formatMoney(outstanding(inv))}</td>
                    <td className={status === "overdue" ? "overdue" : undefined}>{l.enums.invoiceStatus[status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
