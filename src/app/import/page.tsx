import { Flash } from "@/components/Flash";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/domain/money";
import { isoDate } from "@/lib/domain/dates";
import { fmt } from "@/lib/i18n";
import { getDict, requireBusiness } from "@/lib/session";
import { importEqaime, importStatement } from "./actions";

export const dynamic = "force-dynamic";

type Search = Record<string, string | undefined>;

export default async function ImportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const biz = await requireBusiness();
  const [sp, { l }] = await Promise.all([searchParams, getDict()]);
  const recent = await prisma.bankTransaction.findMany({ where: { businessId: biz.id }, orderBy: { date: "desc" }, take: 50 });
  const t = l.imports;
  const n = (k: string) => Number(sp[k] ?? 0);
  const ok =
    sp.ok === "bank" ? fmt(t.resultBank, { added: n("added"), dupes: n("dupes"), skipped: n("skipped") })
    : sp.ok === "eqaime" ? fmt(t.resultEqaime, { created: n("created"), duplicates: n("duplicates"), incoming: n("incoming"), skipped: n("skipped") })
    : null;
  const errors: Record<string, string> = { no_file: t.errNoFile, csv: t.errCsv, xml: t.errXml, no_invoices: t.errNoInvoices };

  return (
    <>
      <h1>{t.title}</h1>
      <Flash ok={ok} err={sp.err ? (errors[sp.err] ?? null) : null} />
      <div className="grid2">
        <section>
          <h2>{t.bankTitle}</h2>
          <p className="muted">{t.bankHelp}</p>
          <form action={importStatement} className="stack">
            <input type="file" name="file" accept=".csv,text/csv" required />
            <button type="submit">{t.upload}</button>
          </form>
        </section>
        <section>
          <h2>{t.eqaimeTitle}</h2>
          <p className="muted">{t.eqaimeHelp}</p>
          <form action={importEqaime} className="stack">
            <input type="file" name="file" accept=".xml,text/xml,application/xml" required />
            <button type="submit">{t.upload}</button>
          </form>
        </section>
      </div>

      <h2>{t.recent}</h2>
      {recent.length === 0 ? (
        <p className="muted">{t.noTx}</p>
      ) : (
        <div className="scroll">
          <table>
            <thead><tr><th>{l.common.date}</th><th>{l.common.description}</th><th>{l.common.counterparty}</th><th className="num">{l.common.amount}</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{isoDate(r.date)}</td>
                  <td>{r.description}</td>
                  <td>{r.counterparty ?? "—"}</td>
                  <td className="num">{formatMoney(r.amountQ, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
