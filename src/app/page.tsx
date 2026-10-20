import Link from "next/link";
import { receivablesView } from "@/lib/db/receivables";
import { countUnmatched } from "@/lib/db/bank";
import { formatMoney } from "@/lib/domain/money";
import { AGEING_BUCKETS } from "@/lib/domain/ageing";
import { isoDate } from "@/lib/domain/dates";
import { fmt } from "@/lib/i18n";
import { getDict, requireBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const biz = await requireBusiness();
  const [{ summary, open, asOf }, unmatched, { l }] = await Promise.all([receivablesView(biz.id), countUnmatched(biz.id), getDict()]);
  const r = l.receivables;
  const colours = ["#16a34a", "#eab308", "#f97316", "#dc2626", "#7f1d1d"];
  const total = summary.totalQ || 1;

  return (
    <>
      <h1>{r.title}</h1>
      <p className="muted">{biz.name}</p>
      {unmatched > 0 && (
        <p className="flash ok">
          {fmt(r.toMatch, { count: unmatched })} <Link href="/payments">{r.toMatchLink}</Link>
        </p>
      )}
      <div className="cards">
        <div className="card"><div className="label">{r.totalOpen}</div><div className="value">{formatMoney(summary.totalQ)}</div></div>
        <div className="card"><div className="label">{r.overdue}</div><div className="value overdue">{formatMoney(summary.overdueQ)}</div></div>
        <div className="card"><div className="label">{r.openInvoices}</div><div className="value">{summary.openCount}</div></div>
      </div>

      <h2>{r.ageing}</h2>
      <div className="bar">
        {AGEING_BUCKETS.map((b, i) => (
          <span key={b} style={{ width: `${(summary.buckets[b] / total) * 100}%`, background: colours[i] }} title={l.enums.bucket[b]} />
        ))}
      </div>
      <p className="muted">
        {AGEING_BUCKETS.map((b) => `${l.enums.bucket[b]}: ${formatMoney(summary.buckets[b])}`).join(" · ")}
      </p>

      <h2>{r.openInvoices}</h2>
      {open.length === 0 ? (
        <p className="muted">{r.noInvoices}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>{l.common.customer}</th><th>{l.common.number}</th><th>{r.due}</th><th className="num">{r.outstanding}</th></tr>
            </thead>
            <tbody>
              {open.map((i) => (
                <tr key={i.id}>
                  <td>{i.customer.name}</td>
                  <td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td>
                  <td className={i.dueDate < asOf ? "overdue" : undefined}>{isoDate(i.dueDate)}</td>
                  <td className="num">{formatMoney(i.outstandingQ)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
