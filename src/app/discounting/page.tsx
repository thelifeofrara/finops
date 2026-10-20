import { requireBusiness } from "@/lib/auth";
import { advanceView } from "@/lib/db/discount";
import { formatMoney } from "@/lib/domain/money";
import { translator, type MessageKey } from "@/lib/i18n";
import { expressInterest } from "./actions";

export const dynamic = "force-dynamic";

const REASON_KEY: Record<string, MessageKey> = {
  paid: "adv_reason_paid",
  overdue: "adv_reason_overdue",
  too_small: "adv_reason_small",
  too_soon: "adv_reason_soon",
  too_far: "adv_reason_far",
  no_history: "adv_reason_new",
  debtor_risk: "adv_reason_risk",
};

export default async function DiscountingPage() {
  const { business } = await requireBusiness();
  const { t } = await translator();
  const rows = await advanceView(business.id);
  return (
    <>
      <h1>{t("adv_title")}</h1>
      <p className="muted">{t("adv_help")}</p>
      {rows.length === 0 ? (
        <p className="muted">{t("noItems")}</p>
      ) : (
        <table>
          <thead>
            <tr><th>{t("number")}</th><th>{t("customer")}</th><th className="num">{t("outstanding")}</th><th>{t("adv_grade")}</th><th>{t("adv_quote")}</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td>{r.customerName}</td>
                <td className="num">{formatMoney(r.outstandingQ)}</td>
                <td>{r.score.grade}</td>
                <td>
                  {r.quote.eligible ? (
                    <>
                      <strong>{formatMoney(r.quote.advanceQ)}</strong> · {t("adv_fee")} {formatMoney(r.quote.feeQ)} · ~{r.quote.expectedDays} {t("adv_days")}
                    </>
                  ) : (
                    <span className="muted">{t(REASON_KEY[r.quote.reason] ?? "adv_reason_risk")}</span>
                  )}
                </td>
                <td>
                  {r.quote.eligible ? (
                    <form action={expressInterest}>
                      <input type="hidden" name="invoiceId" value={r.id} />
                      <input type="hidden" name="advanceQ" value={r.quote.advanceQ} />
                      <input type="hidden" name="feeQ" value={r.quote.feeQ} />
                      <button type="submit" className="small">{t("adv_interest")}</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
