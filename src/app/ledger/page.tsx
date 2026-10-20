import { ledgerView } from "@/lib/db/ledger";
import { formatMoney } from "@/lib/domain/money";
import { isoDate, parseDate, today } from "@/lib/domain/dates";
import { fmt } from "@/lib/i18n";
import { getDict, requireBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const biz = await requireBusiness();
  const [sp, { l, locale }] = await Promise.all([searchParams, getDict()]);
  const t0 = today();
  const to = parseDate(sp.to ?? "") ?? t0;
  const from = parseDate(sp.from ?? "") ?? new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
  const { rows, debitQ, creditQ, pnl } = await ledgerView(biz.id, { from, to });
  const g = l.ledger;
  const name = (a: { nameAz: string; nameEn: string }) => (locale === "en" ? a.nameEn : a.nameAz);

  return (
    <>
      <h1>{g.title}</h1>
      <p className="muted">{g.intro}</p>
      <form className="inline-form" method="get">
        <label>{l.common.from} <input type="date" name="from" defaultValue={isoDate(from)} /></label>
        <label>{l.common.to} <input type="date" name="to" defaultValue={isoDate(to)} /></label>
        <button className="secondary">{l.common.apply}</button>
      </form>

      <h2>{g.pnl}</h2>
      <div className="cards">
        <div className="card"><div className="label">{g.income}</div><div className="value">{formatMoney(pnl.incomeQ)}</div></div>
        <div className="card"><div className="label">{g.expenses}</div><div className="value">{formatMoney(pnl.expenseQ)}</div></div>
        <div className="card"><div className="label">{g.profit}</div><div className={pnl.profitQ < 0 ? "value overdue" : "value"}>{formatMoney(pnl.profitQ)}</div></div>
      </div>
      {pnl.uncategorisedQ !== 0 && <p className="flash error">{fmt(g.uncategorisedWarn, { amount: formatMoney(Math.abs(pnl.uncategorisedQ)) })}</p>}

      <h2>{g.trialBalance}</h2>
      {rows.length === 0 ? (
        <p className="muted">{g.empty}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{g.code}</th><th>{g.account}</th><th className="num">{g.debit}</th><th className="num">{g.credit}</th><th className="num">{g.balance}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account.id}>
                  <td>{r.account.code}</td>
                  <td>{name(r.account)}</td>
                  <td className="num">{formatMoney(r.debitQ)}</td>
                  <td className="num">{formatMoney(r.creditQ)}</td>
                  <td className="num">{formatMoney(r.balanceQ)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th></th><th>{l.common.total}</th><th className="num">{formatMoney(debitQ)}</th><th className="num">{formatMoney(creditQ)}</th><th></th></tr>
            </tfoot>
          </table>
        </div>
      )}
      {rows.length > 0 && <p className={debitQ === creditQ ? "muted" : "flash error"}>{debitQ === creditQ ? g.balanced : g.unbalanced}</p>}
    </>
  );
}
