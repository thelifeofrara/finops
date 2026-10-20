import type { LegalForm, TaxRegime } from "@prisma/client";
import { applyBp } from "./money";

// Filing calendar and simplified-tax preparation. FinOps prepares; the owner files
// with their own ASAN İmza (legal review: direct filing needs a State Tax Service agreement).
// Deadlines follow the Tax Code as summarised in the legal review; the owner should confirm
// them on e-taxes.gov.az, and the UI says so.

/** VAT registration is mandatory once taxable turnover passes ₼200,000 in any 12 months. */
export const VAT_THRESHOLD_Q = 200_000_00;

export interface RegimeAnswers {
  legalForm: LegalForm;
  expectedAnnualTurnoverQ: number;
  wantsVatVoluntarily: boolean;
}

export function adviseRegime(a: RegimeAnswers): { regime: TaxRegime; reason: "over_threshold" | "voluntary_vat" | "under_threshold" } {
  if (a.expectedAnnualTurnoverQ >= VAT_THRESHOLD_Q) return { regime: "VAT", reason: "over_threshold" };
  if (a.wantsVatVoluntarily) return { regime: "VAT", reason: "voluntary_vat" };
  return { regime: "SIMPLIFIED", reason: "under_threshold" };
}

export type DeadlineKind =
  | "simplified_quarterly"
  | "vat_monthly"
  | "profit_annual"
  | "income_annual"
  | "profit_prepayment"
  | "withholding_quarterly";

export interface Deadline {
  kind: DeadlineKind;
  due: Date;
  periodStart: Date;
  periodEnd: Date;
}

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day));

function quarterOf(date: Date) {
  return Math.floor(date.getUTCMonth() / 3);
}

/** Deadlines falling in [from, from + months). */
export function deadlines(
  biz: { taxRegime: TaxRegime; legalForm: LegalForm; hasEmployees: boolean },
  from: Date,
  months = 12,
): Deadline[] {
  const until = d(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate());
  const out: Deadline[] = [];
  // Walk periods starting a year back so the first upcoming deadline is included.
  const startYear = from.getUTCFullYear() - 1;
  for (let y = startYear; y <= until.getUTCFullYear(); y++) {
    for (let q = 0; q < 4; q++) {
      const periodStart = d(y, q * 3, 1);
      const periodEnd = d(y, q * 3 + 3, 0);
      const due20 = d(y, q * 3 + 3, 20);
      if (biz.taxRegime === "SIMPLIFIED") out.push({ kind: "simplified_quarterly", due: due20, periodStart, periodEnd });
      if (biz.hasEmployees) out.push({ kind: "withholding_quarterly", due: due20, periodStart, periodEnd });
      if (biz.taxRegime !== "SIMPLIFIED" && biz.legalForm === "LLC") {
        out.push({ kind: "profit_prepayment", due: d(y, q * 3 + 3, 15), periodStart, periodEnd });
      }
    }
    if (biz.taxRegime === "VAT") {
      for (let m = 0; m < 12; m++) {
        out.push({ kind: "vat_monthly", due: d(y, m + 1, 20), periodStart: d(y, m, 1), periodEnd: d(y, m + 1, 0) });
      }
    }
    if (biz.taxRegime !== "SIMPLIFIED") {
      out.push({
        kind: biz.legalForm === "LLC" ? "profit_annual" : "income_annual",
        due: d(y + 1, 2, 31),
        periodStart: d(y, 0, 1),
        periodEnd: d(y, 11, 31),
      });
    }
  }
  return out.filter((x) => x.due >= from && x.due < until).sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** The quarter that has just closed (or the current one if `current`), for preparing a declaration. */
export function quarterRange(asOf: Date, which: "current" | "previous" = "previous") {
  let y = asOf.getUTCFullYear();
  let q = quarterOf(asOf) - (which === "previous" ? 1 : 0);
  if (q < 0) {
    q = 3;
    y--;
  }
  return { start: d(y, q * 3, 1), end: d(y, q * 3 + 3, 0), label: `${y} Q${q + 1}` };
}

/** Simplified tax is charged on gross cash receipts for the quarter. */
export function prepareSimplifiedTax(receiptsQ: number, rateBp: number) {
  return { baseQ: receiptsQ, rateBp, taxQ: applyBp(receiptsQ, rateBp) };
}

/**
 * Money received in [from, to] that counts toward turnover: every incoming payment except
 * the owner's own capital paid in.
 */
export function receiptsInRange(
  txs: { date: Date; amountQ: number; accountType: string | null }[],
  from: Date,
  to: Date,
): number {
  return txs
    .filter((t) => t.amountQ > 0 && t.date >= from && t.date <= to && t.accountType !== "EQUITY")
    .reduce((s, t) => s + t.amountQ, 0);
}
