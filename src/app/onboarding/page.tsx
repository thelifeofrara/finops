import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { translator } from "@/lib/i18n";
import { createBusiness } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.business) redirect("/");
  const { t } = await translator();
  return (
    <>
      <h1>{t("onb_title")}</h1>
      <p className="muted">{t("onb_sub")}</p>
      <form action={createBusiness} className="stack">
        <input name="name" placeholder={t("onb_name")} required />
        <input name="voen" placeholder={t("onb_voen")} inputMode="numeric" />
        <select name="legalForm" defaultValue="INDIVIDUAL_ENTREPRENEUR">
          <option value="INDIVIDUAL_ENTREPRENEUR">{t("onb_ie")}</option>
          <option value="LLC">{t("onb_llc")}</option>
        </select>
        <input name="turnover" placeholder={t("onb_turnover")} inputMode="decimal" />
        <label><input type="checkbox" name="wantsVat" /> {t("onb_vat")}</label>
        <label><input type="checkbox" name="hasEmployees" /> {t("onb_employees")}</label>
        <label><input type="checkbox" name="consentTax" required /> {t("onb_consent_tax")}</label>
        <label><input type="checkbox" name="consentPersonal" required /> {t("onb_consent_personal")}</label>
        <button type="submit">{t("onb_continue")}</button>
      </form>
    </>
  );
}
