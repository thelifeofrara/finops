import { currentBusiness } from "@/lib/db/business";
import { receivablesView } from "@/lib/db/receivables";
import { formatMoney } from "@/lib/domain/money";
import { AGEING_BUCKETS } from "@/lib/domain/ageing";
import { t } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const biz = await currentBusiness();
  const { summary, open } = await receivablesView(biz.id);
  const l = t.az;
  const colours = ["#16a34a", "#eab308", "#f97316", "#dc2626", "#7f1d1d"];
  const total = summary.totalQ || 1;

  return (
    <>
      <h1>{l.receivables}</h1>
      <p className="muted">{biz.name}</p>
      <div className="cards">
        <div className="card"><div className="label">{l.totalOpen}</div><div className="value">{formatMoney(summary.totalQ)}</div></div>
        <div className="card"><div className="label">{l.overdue}</div><div className="value overdue">{formatMoney(summary.overdueQ)}</div></div>
        <div className="card"><div className="label">{l.openInvoices}</div><div className="value">{summary.openCount}</div></div>
      </div>

      <h2>{l.ageing}</h2>
      <div className="bar">
        {AGEING_BUCKETS.map((b, i) => (
          <span key={b} style={{ width: `${(summary.buckets[b] / total) * 100}%`, background: colours[i] }} title={l.buckets[b]} />
        ))}
      </div>
      <p className="muted">
        {AGEING_BUCKETS.map((b) => `${l.buckets[b]}: ${formatMoney(summary.buckets[b])}`).join(" · ")}
      </p>

      <h2>{l.openInvoices}</h2>
      {open.length === 0 ? (
        <p className="muted">{l.noInvoices}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{l.customer}</th><th>{l.number}</th><th>{l.due}</th><th className="num">{l.outstanding}</th></tr>
          </thead>
          <tbody>
            {open.map((i) => (
              <tr key={i.id}>
                <td>{i.customer.name}</td>
                <td>{i.number}</td>
                <td className={i.dueDate < new Date() ? "overdue" : undefined}>{i.dueDate.toISOString().slice(0, 10)}</td>
                <td className="num">{formatMoney(i.outstandingQ)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
