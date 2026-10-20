import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/domain/money";
import { translator } from "@/lib/i18n";
import Link from "next/link";
import { importEqaime, importStatement } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const { business } = await requireBusiness();
  const { t } = await translator();
  const recent = await prisma.bankTransaction.findMany({ where: { businessId: business.id }, orderBy: { date: "desc" }, take: 30 });
  return (
    <>
      <h1>{t("imp_title")}</h1>
      <h2>Bank</h2>
      <p className="muted">{t("imp_bank_help")}</p>
      <form action={importStatement} className="stack">
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button type="submit">{t("imp_bank_upload")}</button>
      </form>

      <h2>e-qaimə</h2>
      <p className="muted">{t("imp_eqaime_help")}</p>
      <form action={importEqaime} className="stack">
        <input type="file" name="file" accept=".xml,text/xml,application/xml" required />
        <button type="submit">{t("imp_eqaime_upload")}</button>
      </form>

      <p><Link href="/payments">{t("imp_go_payments")} →</Link></p>
      <h2>{t("imp_recent")}</h2>
      {recent.length === 0 ? (
        <p className="muted">{t("noItems")}</p>
      ) : (
        <table>
          <thead><tr><th>{t("date")}</th><th>{t("description")}</th><th>{t("counterparty")}</th><th className="num">{t("amount")}</th></tr></thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.date.toISOString().slice(0, 10)}</td>
                <td>{r.description}</td>
                <td>{r.counterparty ?? "—"}</td>
                <td className="num">{formatMoney(r.amountQ, { sign: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
