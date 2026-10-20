import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { loadInvoices } from "@/lib/db/receivables";
import { outstanding } from "@/lib/domain/ageing";
import { suggestMatches, type OpenInvoice } from "@/lib/domain/matching";
import { formatMoney } from "@/lib/domain/money";
import { translator } from "@/lib/i18n";
import { categorisePayment, matchPayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const { business } = await requireBusiness();
  const { t } = await translator();

  const invoices = await loadInvoices(business.id);
  const open: OpenInvoice[] = invoices
    .map((i) => ({
      id: i.id,
      number: i.number,
      issueDate: i.issueDate,
      outstandingQ: outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }),
      customerName: i.customer.name,
      customerVoen: i.customer.voen,
    }))
    .filter((i) => i.outstandingQ > 0);

  const incoming = await prisma.bankTransaction.findMany({
    where: { businessId: business.id, amountQ: { gt: 0 }, accountId: null },
    include: { allocations: true },
    orderBy: { date: "desc" },
    take: 50,
  });
  const pending = incoming.filter((tx) => tx.amountQ - tx.allocations.reduce((s, a) => s + a.amountQ, 0) > 0);

  const accounts = await prisma.account.findMany({
    where: { businessId: business.id, type: { in: ["INCOME", "LIABILITY", "EQUITY", "ASSET"] } },
    orderBy: { code: "asc" },
  });

  return (
    <>
      <h1>{t("pay_title")}</h1>
      <p className="muted">{t("pay_help")}</p>
      {pending.length === 0 ? (
        <p className="muted">{t("pay_none")}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{t("date")}</th><th>{t("counterparty")}</th><th>{t("description")}</th><th className="num">{t("amount")}</th><th>{t("pay_pick")}</th></tr>
          </thead>
          <tbody>
            {pending.map((tx) => {
              const suggestions = suggestMatches(
                { date: tx.date, amountQ: tx.amountQ, description: tx.description, counterparty: tx.counterparty, counterpartyVoen: tx.counterpartyVoen },
                open,
              );
              const best = suggestions[0];
              return (
                <tr key={tx.id}>
                  <td>{tx.date.toISOString().slice(0, 10)}</td>
                  <td>{tx.counterparty ?? "—"}</td>
                  <td>{tx.description}</td>
                  <td className="num">{formatMoney(tx.amountQ)}</td>
                  <td>
                    {suggestions.length > 0 ? (
                      <form action={matchPayment} className="inline">
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <select name="invoiceId" className="small" defaultValue={best.invoiceId}>
                          {suggestions.map((s) => {
                            const inv = open.find((o) => o.id === s.invoiceId)!;
                            return (
                              <option key={s.invoiceId} value={s.invoiceId}>
                                {inv.number} · {inv.customerName} · {formatMoney(inv.outstandingQ)}
                              </option>
                            );
                          })}
                        </select>
                        <button type="submit" className="small">{t("confirm")}</button>
                      </form>
                    ) : (
                      <span className="muted">{t("pay_no_match")}</span>
                    )}
                    <form action={categorisePayment} className="inline" style={{ marginTop: 6 }}>
                      <input type="hidden" name="transactionId" value={tx.id} />
                      <select name="accountId" className="small">
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} {a.nameEn}</option>
                        ))}
                      </select>
                      <label className="small"><input type="checkbox" name="learn" defaultChecked /> {t("led_learn")}</label>
                      <button type="submit" className="small">{t("save")}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
