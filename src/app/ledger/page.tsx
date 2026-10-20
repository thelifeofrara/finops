import { requireBusiness } from "@/lib/auth";
import { ledgerView } from "@/lib/db/ledgerData";
import { formatMoney } from "@/lib/domain/money";
import { translator } from "@/lib/i18n";
import { setCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const { business } = await requireBusiness();
  const { t, locale } = await translator();
  const { accounts, rows, pl, transactions } = await ledgerView(business.id);
  const name = (a: { nameAz: string; nameEn: string }) => (locale === "en" ? a.nameEn : a.nameAz);

  return (
    <>
      <h1>{t("led_title")}</h1>
      <div className="cards">
        <div className="card"><div className="label">{t("led_income")}</div><div className="value">{formatMoney(pl.incomeQ)}</div></div>
        <div className="card"><div className="label">{t("led_expense")}</div><div className="value">{formatMoney(pl.expenseQ)}</div></div>
        <div className="card"><div className="label">{t("led_profit")}</div><div className="value">{formatMoney(pl.profitQ)}</div></div>
        <div className="card"><div className="label">{t("led_uncat")}</div><div className="value overdue">{formatMoney(pl.uncategorisedQ)}</div></div>
      </div>

      <h2>{t("led_tb")}</h2>
      {rows.length === 0 ? (
        <p className="muted">{t("noItems")}</p>
      ) : (
        <table>
          <thead><tr><th>Kod</th><th>{t("description")}</th><th className="num">{t("led_debit")}</th><th className="num">{t("led_credit")}</th><th className="num">{t("led_balance")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account.code}>
                <td>{r.account.code}</td>
                <td>{name(r.account)}</td>
                <td className="num">{formatMoney(r.debitQ)}</td>
                <td className="num">{formatMoney(r.creditQ)}</td>
                <td className="num">{formatMoney(r.balanceQ)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t("led_tx")}</h2>
      {transactions.length === 0 ? (
        <p className="muted">{t("noItems")}</p>
      ) : (
        <table>
          <thead><tr><th>{t("date")}</th><th>{t("counterparty")}</th><th className="num">{t("amount")}</th><th>{t("category")}</th></tr></thead>
          <tbody>
            {transactions.slice(0, 100).map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date.toISOString().slice(0, 10)}</td>
                <td>{tx.counterparty ?? tx.description}</td>
                <td className="num">{formatMoney(tx.amountQ, { sign: true })}</td>
                <td>
                  <form action={setCategory} className="inline">
                    <input type="hidden" name="transactionId" value={tx.id} />
                    <select name="accountId" className="small" defaultValue={tx.accountId ?? ""}>
                      <option value="" disabled>—</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} {name(a)}</option>
                      ))}
                    </select>
                    {tx.categorySource && tx.categorySource !== "MANUAL" ? <span className="pill">{t("led_auto")}</span> : null}
                    <label className="small"><input type="checkbox" name="learn" defaultChecked /> {t("led_learn")}</label>
                    <button type="submit" className="small">{t("save")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
