import type { Dict } from "@/lib/i18n";
import type { BusinessInput } from "@/lib/businessForm";

export function BusinessFields({ l, value }: { l: Dict; value: Partial<BusinessInput> }) {
  const o = l.onboarding;
  return (
    <>
      <label>{o.name}<input name="name" defaultValue={value.name} required /></label>
      <label>{o.voen}<input name="voen" defaultValue={value.voen ?? ""} inputMode="numeric" pattern="\d{10}" /></label>
      <label>
        {o.legalForm}
        <select name="legalForm" defaultValue={value.legalForm ?? "INDIVIDUAL_ENTREPRENEUR"}>
          {(["INDIVIDUAL_ENTREPRENEUR", "LLC"] as const).map((f) => <option key={f} value={f}>{l.enums.legalForm[f]}</option>)}
        </select>
      </label>
      <label>
        {o.taxRegime}
        <select name="taxRegime" defaultValue={value.taxRegime ?? "SIMPLIFIED"}>
          {(["SIMPLIFIED", "VAT", "NON_VAT_GENERAL"] as const).map((r) => <option key={r} value={r}>{l.enums.taxRegime[r]}</option>)}
        </select>
        <small className="muted">{o.regimeHelp}</small>
      </label>
      <label>{o.rate}<input name="rate" inputMode="decimal" defaultValue={((value.simplifiedRateBp ?? 200) / 100).toString()} /></label>
      <label className="check"><input type="checkbox" name="hasEmployees" defaultChecked={value.hasEmployees} /> {o.hasEmployees}</label>
      <label>{o.replyTo}<input name="replyTo" type="email" defaultValue={value.replyToEmail} required /></label>
    </>
  );
}
