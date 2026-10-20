import { requireBusiness } from "@/lib/auth";
import { loadInvoices } from "@/lib/db/receivables";
import { invoiceStatus, outstanding, type InvoiceStatus } from "@/lib/domain/ageing";
import { formatMoney } from "@/lib/domain/money";
import { today } from "@/lib/domain/dates";
import { translator, type MessageKey } from "@/lib/i18n";
import { createInvoice } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_KEY: Record<InvoiceStatus, MessageKey> = {
  open: "st_open",
  partial: "st_partial",
  paid: "st_paid",
  overdue: "st_overdue",
  void: "st_void",
};

export default async function InvoicesPage() {
  const { business } = await requireBusiness();
  const invoices = await loadInvoices(business.id);
  const asOf = today();
  const { t } = await translator();

  return (
    <>
      <h1>{t("inv_title")}</h1>
      <details open>
        <summary>{t("inv_new")}</summary>
        <form action={createInvoice} className="stack" style={{ marginTop: 12 }}>
          <input name="customer" placeholder={t("inv_name_placeholder")} required />
          <input name="number" placeholder={t("inv_number_placeholder")} required />
          <input name="amount" placeholder={t("inv_amount_placeholder")} inputMode="decimal" required />
          <input name="vat" placeholder={t("inv_vat_placeholder")} inputMode="decimal" />
          <input name="issueDate" type="date" defaultValue={asOf.toISOString().slice(0, 10)} />
          <select name="termsDays" defaultValue="30">
            <option value="14">14</option>
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
          <button type="submit">{t("save")}</button>
        </form>
      </details>

      <h2>{t("inv_list")}</h2>
      {invoices.length === 0 ? (
        <p className="muted">{t("noInvoices")}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{t("number")}</th><th>{t("customer")}</th><th>{t("due")}</th><th className="num">{t("amount")}</th><th className="num">{t("outstanding")}</th><th>{t("status")}</th></tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const inv = { id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided };
              const status = invoiceStatus(inv, asOf);
              return (
                <tr key={i.id}>
                  <td>{i.number}</td>
                  <td>{i.customer.name}</td>
                  <td>{i.dueDate.toISOString().slice(0, 10)}</td>
                  <td className="num">{formatMoney(i.amountQ)}</td>
                  <td className="num">{formatMoney(outstanding(inv))}</td>
                  <td className={status === "overdue" ? "overdue" : undefined}>{t(STATUS_KEY[status])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
