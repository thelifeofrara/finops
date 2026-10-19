import { currentBusiness } from "@/lib/db/business";
import { loadInvoices } from "@/lib/db/receivables";
import { invoiceStatus, outstanding } from "@/lib/domain/ageing";
import { formatMoney } from "@/lib/domain/money";
import { today } from "@/lib/domain/dates";
import { t } from "@/lib/format";
import { createInvoice } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_AZ = { open: "Açıq", partial: "Qismən ödənilib", paid: "Ödənilib", overdue: "Gecikir", void: "Ləğv edilib" } as const;

export default async function InvoicesPage() {
  const biz = await currentBusiness();
  const invoices = await loadInvoices(biz.id);
  const asOf = today();
  const l = t.az;

  return (
    <>
      <h1>{l.invoices}</h1>
      <details open>
        <summary>Yeni hesab-faktura</summary>
        <form action={createInvoice} className="stack" style={{ marginTop: 12 }}>
          <input name="customer" placeholder="Müştəri adı" required />
          <input name="number" placeholder="Nömrə (məs. FT-1001)" required />
          <input name="amount" placeholder="Məbləğ, ₼ (ƏDV daxil)" inputMode="decimal" required />
          <input name="vat" placeholder="ƏDV məbləği, ₼ (boş ola bilər)" inputMode="decimal" />
          <input name="issueDate" type="date" defaultValue={asOf.toISOString().slice(0, 10)} />
          <select name="termsDays" defaultValue="30">
            <option value="14">14 gün</option>
            <option value="30">30 gün</option>
            <option value="60">60 gün</option>
          </select>
          <button type="submit">Yadda saxla</button>
        </form>
      </details>

      <h2>Siyahı</h2>
      {invoices.length === 0 ? (
        <p className="muted">{l.noInvoices}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{l.number}</th><th>{l.customer}</th><th>{l.due}</th><th className="num">Məbləğ</th><th className="num">{l.outstanding}</th><th>{l.status}</th></tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const status = invoiceStatus({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }, asOf);
              return (
                <tr key={i.id}>
                  <td>{i.number}</td>
                  <td>{i.customer.name}</td>
                  <td>{i.dueDate.toISOString().slice(0, 10)}</td>
                  <td className="num">{formatMoney(i.amountQ)}</td>
                  <td className="num">{formatMoney(outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }))}</td>
                  <td className={status === "overdue" ? "overdue" : undefined}>{STATUS_AZ[status]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
