import { prisma } from "@/lib/db/prisma";
import { deadlines, prepareSimplifiedTax, quarterRange, receiptsInRange, VAT_THRESHOLD_Q } from "@/lib/domain/tax";
import { formatMoney } from "@/lib/domain/money";
import { addDays, daysBetween, isoDate, today } from "@/lib/domain/dates";
import { fmt } from "@/lib/i18n";
import { getDict, requireBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TaxPage() {
  const biz = await requireBusiness();
  const { l } = await getDict();
  const t = l.tax;
  const asOf = today();
  const upcoming = deadlines(biz, asOf, 12);

  const txs = await prisma.bankTransaction.findMany({
    where: { businessId: biz.id, amountQ: { gt: 0 }, date: { gte: addDays(asOf, -400) } },
    select: { date: true, amountQ: true, account: { select: { type: true } } },
  });
  const flat = txs.map((x) => ({ date: x.date, amountQ: x.amountQ, accountType: x.account?.type ?? null }));
  const quarters = [quarterRange(asOf, "previous"), quarterRange(asOf, "current")].map((q) => ({
    ...q,
    ...prepareSimplifiedTax(receiptsInRange(flat, q.start, q.end), biz.simplifiedRateBp),
  }));
  const last12 = receiptsInRange(flat, addDays(asOf, -365), asOf);
  const share = Math.round((last12 / VAT_THRESHOLD_Q) * 100);

  return (
    <>
      <h1>{t.title}</h1>
      <p className="muted">{t.intro}</p>

      {biz.taxRegime !== "VAT" && (
        <>
          <h2>{t.vatWatch}</h2>
          <div className="bar"><span style={{ width: `${Math.min(100, share)}%`, background: share >= 100 ? "#dc2626" : share >= 80 ? "#f97316" : "#16a34a" }} /></div>
          <p className={share >= 80 ? "overdue" : "muted"}>{fmt(t.vatWatchBody, { amount: formatMoney(last12), share })}</p>
          {share >= 100 && <p className="flash error">{t.vatOver}</p>}
        </>
      )}

      <h2>{t.upcoming}</h2>
      {upcoming.length === 0 ? (
        <p className="muted">{t.noDeadlines}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{t.deadline}</th><th>{t.obligation}</th><th>{t.period}</th><th className="num">{t.daysLeft}</th></tr></thead>
            <tbody>
              {upcoming.map((d) => {
                const left = daysBetween(asOf, d.due);
                return (
                  <tr key={`${d.kind}-${isoDate(d.due)}-${isoDate(d.periodStart)}`}>
                    <td className={left <= 7 ? "overdue" : undefined}>{isoDate(d.due)}</td>
                    <td>{l.enums.deadline[d.kind]}</td>
                    <td>{isoDate(d.periodStart)} – {isoDate(d.periodEnd)}</td>
                    <td className="num">{left} {l.common.days}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {biz.taxRegime === "SIMPLIFIED" && (
        <>
          <h2>{t.simplifiedTitle}</h2>
          <p className="muted">{t.simplifiedHelp}</p>
          <div className="scroll">
            <table>
              <thead><tr><th>{t.quarter}</th><th className="num">{t.receipts}</th><th className="num">{t.rate}</th><th className="num">{t.taxDue}</th></tr></thead>
              <tbody>
                {quarters.map((q) => (
                  <tr key={q.label}>
                    <td>{q.label} ({isoDate(q.start)} – {isoDate(q.end)})</td>
                    <td className="num">{formatMoney(q.baseQ)}</td>
                    <td className="num">{(q.rateBp / 100).toString().replace(".", ",")}%</td>
                    <td className="num">{formatMoney(q.taxQ)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="muted">{l.common.confirmOnSite}</p>
    </>
  );
}
