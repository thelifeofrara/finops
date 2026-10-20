import { currentBusiness } from "@/lib/db/business";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/domain/money";
import { importStatement } from "./actions";
import { t } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const biz = await currentBusiness();
  const recent = await prisma.bankTransaction.findMany({
    where: { businessId: biz.id },
    orderBy: { date: "desc" },
    take: 50,
  });
  return (
    <>
      <h1>{t.az.imports}</h1>
      <p className="muted">Bank hesab çıxarışını CSV faylı kimi yükləyin. Başlıq sətri (Tarix, Mədaxil, Məxaric, Təyinat, Qarşı tərəf, VÖEN) avtomatik tanınır.</p>
      <form action={importStatement} className="stack">
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button type="submit">Yüklə</button>
      </form>

      <h2>Son əməliyyatlar</h2>
      {recent.length === 0 ? (
        <p className="muted">Hələ əməliyyat yoxdur.</p>
      ) : (
        <table>
          <thead><tr><th>Tarix</th><th>Təyinat</th><th>Qarşı tərəf</th><th className="num">Məbləğ</th></tr></thead>
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
