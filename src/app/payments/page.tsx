import Link from "next/link";
import { Flash } from "@/components/Flash";
import { prisma } from "@/lib/db/prisma";
import { loadTransactions, needsMatching, openInvoicesForMatching } from "@/lib/db/bank";
import { suggestMatches } from "@/lib/domain/matching";
import { formatMoney } from "@/lib/domain/money";
import { isoDate } from "@/lib/domain/dates";
import { getDict, requireBusiness } from "@/lib/session";
import { matchPayment, setCategory, unmatchPayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const biz = await requireBusiness();
  const [txs, openInvoices, accounts, { l, locale }, { ok, err }] = await Promise.all([
    loadTransactions(biz.id),
    openInvoicesForMatching(biz.id),
    prisma.account.findMany({ where: { businessId: biz.id }, orderBy: { code: "asc" } }),
    getDict(),
    searchParams,
  ]);
  const p = l.payments;
  const invoiceById = new Map(openInvoices.map((i) => [i.id, i]));
  const accountName = (a: { nameAz: string; nameEn: string }) => (locale === "en" ? a.nameEn : a.nameAz);
  const toMatch = txs.filter(needsMatching).slice(0, 50);
  const matched = txs.flatMap((t) => t.allocations.map((a) => ({ ...a, tx: t }))).slice(0, 50);

  return (
    <>
      <h1>{p.title}</h1>
      <p className="muted">{p.intro}</p>
      <Flash ok={ok ? p.matchedOk : null} err={err ? p.errMatch : null} />

      <h2>{p.toMatch}</h2>
      {txs.length === 0 ? (
        <p className="muted">{p.noTx} <Link href="/import">{l.nav.imports}</Link></p>
      ) : toMatch.length === 0 ? (
        <p className="muted">{p.noneToMatch}</p>
      ) : (
        <ul className="match-list">
          {toMatch.map((tx) => {
            const suggestions = suggestMatches({ ...tx, amountQ: tx.unallocatedQ }, openInvoices).slice(0, 3);
            return (
              <li key={tx.id} className="card">
                <div className="match-head">
                  <div>
                    <strong>{tx.counterparty ?? "—"}</strong> · {isoDate(tx.date)}
                    <div className="muted">{tx.description}</div>
                  </div>
                  <div className="num">
                    <div>{formatMoney(tx.amountQ, { sign: true })}</div>
                    {tx.allocatedQ > 0 && <div className="muted">{p.remaining}: {formatMoney(tx.unallocatedQ)}</div>}
                  </div>
                </div>
                {suggestions.length === 0 ? (
                  <p className="muted">{p.noSuggestion}</p>
                ) : (
                  <div className="suggestions">
                    {suggestions.map((s) => {
                      const inv = invoiceById.get(s.invoiceId)!;
                      return (
                        <form key={s.invoiceId} action={matchPayment} className="suggestion">
                          <input type="hidden" name="transactionId" value={tx.id} />
                          <input type="hidden" name="invoiceId" value={s.invoiceId} />
                          <span>
                            <strong>{inv.number}</strong> · {inv.customerName} · {formatMoney(inv.outstandingQ)}
                            <span className="muted"> ({s.reasons.map((r) => l.enums.matchReason[r]).join(", ")})</span>
                          </span>
                          <button>{l.common.confirm} {formatMoney(s.amountQ)}</button>
                        </form>
                      );
                    })}
                  </div>
                )}
                {openInvoices.length > 0 && (
                  <form action={matchPayment} className="inline-form">
                    <input type="hidden" name="transactionId" value={tx.id} />
                    <select name="invoiceId" required defaultValue="" aria-label={p.matchManually}>
                      <option value="" disabled>{p.matchManually}</option>
                      {openInvoices.map((i) => (
                        <option key={i.id} value={i.id}>{i.number} · {i.customerName} · {formatMoney(i.outstandingQ)}</option>
                      ))}
                    </select>
                    <button className="secondary">{l.common.confirm}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2>{p.matched}</h2>
      {matched.length === 0 ? (
        <p className="muted">{p.noMatched}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{l.common.date}</th><th>{l.common.counterparty}</th><th>{p.invoice}</th><th className="num">{l.common.amount}</th><th></th></tr></thead>
            <tbody>
              {matched.map((a) => (
                <tr key={a.id}>
                  <td>{isoDate(a.tx.date)}</td>
                  <td>{a.tx.counterparty ?? a.tx.description}</td>
                  <td><Link href={`/invoices/${a.invoice.id}`}>{a.invoice.number}</Link></td>
                  <td className="num">{formatMoney(a.amountQ)}</td>
                  <td>
                    <form action={unmatchPayment}>
                      <input type="hidden" name="allocationId" value={a.id} />
                      <button className="link">{l.common.undo}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 id="categories">{p.categorise}</h2>
      <p className="muted">{p.categoriseHelp}</p>
      {txs.length > 0 && (
        <div className="scroll">
          <table>
            <thead><tr><th>{l.common.date}</th><th>{l.common.counterparty}</th><th className="num">{l.common.amount}</th><th>{p.category}</th></tr></thead>
            <tbody>
              {txs.slice(0, 100).map((tx) => {
                const rest = tx.amountQ > 0 ? tx.unallocatedQ : tx.amountQ;
                if (rest === 0) return null;
                return (
                  <tr key={tx.id}>
                    <td>{isoDate(tx.date)}</td>
                    <td>
                      {tx.counterparty ?? "—"}
                      <div className="muted">{tx.description}</div>
                    </td>
                    <td className="num">{formatMoney(rest, { sign: true })}</td>
                    <td>
                      <form action={setCategory} className="inline-form">
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <select name="accountId" defaultValue={tx.accountId ?? ""} aria-label={p.category}>
                          <option value="">{p.uncategorised}</option>
                          {accounts.filter((a) => a.system !== "suspense").map((a) => (
                            <option key={a.id} value={a.id}>{a.code} {accountName(a)}</option>
                          ))}
                        </select>
                        <button className="secondary">{l.common.save}</button>
                      </form>
                      {tx.categorySource && <div className="muted">{l.enums.categorySource[tx.categorySource]}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
