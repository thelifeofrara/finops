import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { loadInvoices } from "@/lib/db/receivables";
import { debtorScores } from "@/lib/db/debtors";
import { quoteAdvance } from "@/lib/domain/advance";
import { outstanding } from "@/lib/domain/ageing";
import { formatMoney } from "@/lib/domain/money";
import { isoDate, today } from "@/lib/domain/dates";
import { getDict, requireBusiness } from "@/lib/session";
import { registerInterest } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdvancePage() {
  const biz = await requireBusiness();
  const asOf = today();
  const [invoices, scores, interests, { l, locale }] = await Promise.all([
    loadInvoices(biz.id),
    debtorScores(biz.id, asOf),
    prisma.advanceInterest.findMany({ where: { invoice: { businessId: biz.id } }, select: { invoiceId: true } }),
    getDict(),
  ]);
  const a = l.advance;
  const pct = (bp: number) => (bp / 100).toFixed(1).replace(/\.0$/, "").replace(".", locale === "az" ? "," : ".");
  const interested = new Set(interests.map((i) => i.invoiceId));
  const rows = invoices
    .map((i) => ({ ...i, outstandingQ: outstanding({ id: i.id, customerId: i.customerId, dueDate: i.dueDate, amountQ: i.amountQ, paidQ: i.paidQ, voided: i.voided }) }))
    .filter((i) => i.outstandingQ > 0)
    .map((i) => {
      const score = scores.get(i.customerId);
      const grade = score?.grade ?? "new";
      return { inv: i, grade, quote: quoteAdvance({ outstandingQ: i.outstandingQ, dueDate: i.dueDate, asOf, grade, avgDaysLate: score?.avgDaysLate ?? 0 }) };
    });

  return (
    <>
      <h1>{a.title}</h1>
      <p>{a.intro}</p>
      <p className="flash ok">{a.notice}</p>
      <p className="muted">{a.gradeHelp}</p>
      {rows.length === 0 ? (
        <p className="muted">{a.noOpen}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>{l.common.number}</th><th>{l.common.customer}</th><th>{l.receivables.due}</th><th className="num">{l.receivables.outstanding}</th>
                <th>{a.grade}</th><th className="num">{a.advance}</th><th className="num">{a.fee}</th><th className="num">{a.expectedDays}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, grade, quote }) => (
                <tr key={inv.id}>
                  <td><Link href={`/invoices/${inv.id}`}>{inv.number}</Link></td>
                  <td>{inv.customer.name}</td>
                  <td>{isoDate(inv.dueDate)}</td>
                  <td className="num">{formatMoney(inv.outstandingQ)}</td>
                  <td><span className={`grade g-${grade}`}>{grade === "new" ? "—" : grade}</span></td>
                  {quote.eligible ? (
                    <>
                      <td className="num">{formatMoney(quote.advanceQ)} <span className="muted">({pct(quote.advanceRateBp)}%)</span></td>
                      <td className="num">{formatMoney(quote.feeQ)} <span className="muted">({a.annualised} {pct(quote.annualisedBp)}%)</span></td>
                      <td className="num">{quote.expectedDays}</td>
                      <td>
                        {interested.has(inv.id) ? (
                          <span className="muted">✓ {a.interestRecorded}</span>
                        ) : (
                          <form action={registerInterest}>
                            <input type="hidden" name="invoiceId" value={inv.id} />
                            <button className="secondary">{a.interested}</button>
                          </form>
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="muted">{a.notEligible}: {l.enums.ineligible[quote.reason]}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
