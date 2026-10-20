import { requireBusiness } from "@/lib/auth";
import { taxView } from "@/lib/db/tax";
import { formatMoney } from "@/lib/domain/money";
import { translator, type MessageKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const REGIME_KEY: Record<string, MessageKey> = { SIMPLIFIED: "tax_simplified", VAT: "tax_vat", NON_VAT_GENERAL: "tax_non_vat" };
const KIND_LABEL: Record<string, { az: string; en: string }> = {
  simplified_quarterly: { az: "Sadələşdirilmiş vergi bəyannaməsi (rüblük)", en: "Simplified tax return (quarterly)" },
  vat_monthly: { az: "ƏDV bəyannaməsi (aylıq)", en: "VAT return (monthly)" },
  profit_annual: { az: "Mənfəət vergisi bəyannaməsi (illik)", en: "Profit tax return (annual)" },
  income_annual: { az: "Gəlir vergisi bəyannaməsi (illik)", en: "Income tax return (annual)" },
  profit_prepayment: { az: "Mənfəət vergisi ön ödənişi", en: "Profit tax prepayment" },
  withholding_quarterly: { az: "Tutulan vergilərin bəyannaməsi (rüblük)", en: "Withheld taxes return (quarterly)" },
};

export default async function TaxPage() {
  const { business } = await requireBusiness();
  const { t, locale } = await translator();
  const { biz, quarter, receiptsQ, prepared, upcoming } = await taxView(business.id);
  return (
    <>
      <h1>{t("tax_title")}</h1>
      <div className="cards">
        <div className="card"><div className="label">{t("tax_regime")}</div><div className="value">{t(REGIME_KEY[biz.taxRegime] ?? "tax_non_vat")}</div></div>
      </div>

      {prepared ? (
        <>
          <h2>{t("tax_prepared")} · {quarter.label}</h2>
          <table>
            <tbody>
              <tr><td>{t("tax_base")}</td><td className="num">{formatMoney(prepared.baseQ)}</td></tr>
              <tr><td>{t("tax_rate")}</td><td className="num">{(prepared.rateBp / 100).toFixed(1)}%</td></tr>
              <tr><td><strong>{t("tax_due")}</strong></td><td className="num"><strong>{formatMoney(prepared.taxQ)}</strong></td></tr>
            </tbody>
          </table>
          <p className="muted">{t("tax_disclaimer")}</p>
          <p className="muted">{quarter.label} · {formatMoney(receiptsQ)}</p>
        </>
      ) : null}

      <h2>{t("tax_calendar")}</h2>
      {upcoming.length === 0 ? (
        <p className="muted">{t("noItems")}</p>
      ) : (
        <table>
          <thead><tr><th>{t("due")}</th><th>Bəyannamə</th></tr></thead>
          <tbody>
            {upcoming.map((d, i) => (
              <tr key={`${d.kind}-${i}`}>
                <td>{d.due.toISOString().slice(0, 10)}</td>
                <td>{KIND_LABEL[d.kind]?.[locale] ?? d.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">{t("tax_disclaimer")}</p>
    </>
  );
}
