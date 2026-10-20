import type { LegalForm, TaxRegime } from "@prisma/client";
import { isEmail, normalizeEmail } from "./domain/auth";

const LEGAL_FORMS: LegalForm[] = ["INDIVIDUAL_ENTREPRENEUR", "LLC"];
const REGIMES: TaxRegime[] = ["SIMPLIFIED", "VAT", "NON_VAT_GENERAL"];

export interface BusinessInput {
  name: string;
  voen: string | null;
  legalForm: LegalForm;
  taxRegime: TaxRegime;
  simplifiedRateBp: number;
  hasEmployees: boolean;
  replyToEmail: string;
}

/** Reads the shared business fields of the onboarding and settings forms. */
export function readBusinessForm(formData: FormData): { ok: true; value: BusinessInput } | { ok: false; error: "required" | "voen" } {
  const name = String(formData.get("name") ?? "").trim();
  const voenRaw = String(formData.get("voen") ?? "").replace(/\s/g, "");
  const legalForm = String(formData.get("legalForm")) as LegalForm;
  const taxRegime = String(formData.get("taxRegime")) as TaxRegime;
  const ratePct = Number(String(formData.get("rate") ?? "2").replace(",", "."));
  const replyToEmail = normalizeEmail(String(formData.get("replyTo") ?? ""));

  if (!name || !isEmail(replyToEmail) || !LEGAL_FORMS.includes(legalForm) || !REGIMES.includes(taxRegime)) {
    return { ok: false, error: "required" };
  }
  if (voenRaw && !/^\d{10}$/.test(voenRaw)) return { ok: false, error: "voen" };
  const simplifiedRateBp = Number.isFinite(ratePct) && ratePct > 0 && ratePct <= 20 ? Math.round(ratePct * 100) : 200;
  return {
    ok: true,
    value: { name, voen: voenRaw || null, legalForm, taxRegime, simplifiedRateBp, hasEmployees: formData.get("hasEmployees") === "on", replyToEmail },
  };
}
