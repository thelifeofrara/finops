import { requireBusiness } from "@/lib/auth";
import { receivablesView } from "@/lib/db/receivables";
import { formatMoney } from "@/lib/domain/money";
import { AGEING_BUCKETS, type AgeingBucket } from "@/lib/domain/ageing";
import { translator, type MessageKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const BUCKET_KEY: Record<AgeingBucket, MessageKey> = {
  current: "bucket_current",
  d1_30: "bucket_d1_30",
  d31_60: "bucket_d31_60",
  d61_90: "bucket_d61_90",
  d90_plus: "bucket_d90_plus",
};

export default async function ReceivablesPage() {
  const { business } = await requireBusiness();
  const { summary, open, asOf } = await receivablesView(business.id);
  const { t } = await translator();
  const colours = ["#16a34a", "#eab308", "#f97316", "#dc2626", "#7f1d1d"];
  const total = summary.totalQ || 1;

  return (
    <>
      <h1>{t("nav_receivables")}</h1>
      <p className="muted">{business.name}</p>
      <div className="cards">
        <div className="card"><div className="label">{t("totalOpen")}</div><div className="value">{formatMoney(summary.totalQ)}</div></div>
        <div className="card"><div className="label">{t("overdue")}</div><div className="value overdue">{formatMoney(summary.overdueQ)}</div></div>
        <div className="card"><div className="label">{t("openInvoices")}</div><div className="value">{summary.openCount}</div></div>
      </div>

      <h2>{t("ageing")}</h2>
      <div className="bar">
        {AGEING_BUCKETS.map((b, i) => (
          <span key={b} style={{ width: `${(summary.buckets[b] / total) * 100}%`, background: colours[i] }} title={t(BUCKET_KEY[b])} />
        ))}
      </div>
      <p className="muted">
        {AGEING_BUCKETS.map((b) => `${t(BUCKET_KEY[b])}: ${formatMoney(summary.buckets[b])}`).join(" · ")}
      </p>

      <h2>{t("openInvoices")}</h2>
      {open.length === 0 ? (
        <p className="muted">{t("noInvoices")}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{t("customer")}</th><th>{t("number")}</th><th>{t("due")}</th><th className="num">{t("outstanding")}</th></tr>
          </thead>
          <tbody>
            {open.map((i) => (
              <tr key={i.id}>
                <td>{i.customer.name}</td>
                <td>{i.number}</td>
                <td className={i.dueDate < asOf ? "overdue" : undefined}>{i.dueDate.toISOString().slice(0, 10)}</td>
                <td className="num">{formatMoney(i.outstandingQ)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
