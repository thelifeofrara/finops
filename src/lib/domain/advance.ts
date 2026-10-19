import { applyBp } from "./money";
import { daysBetween } from "./dates";
import type { DebtorGrade } from "./scoring";

// Invoice discounting preview. FinOps never lends: a licensed bank or NBCI partner would.
// These numbers mirror the financial model's base case (Inputs sheet) and are shown as an
// indicative quote only, so we can measure demand before a partner is signed.

export const ADVANCE_TERMS = {
  /** Partner fee per 30 days, in basis points of the advance (1.8%). */
  feeBpPer30Days: 180,
  /** FinOps' share of the partner's fee, in basis points (35%). Not shown to the business. */
  finopsShareBp: 3500,
  minInvoiceQ: 50_000, // ₼500
  minDaysToDue: 7,
  maxDaysToDue: 120,
  advanceRateBp: { A: 8000, B: 7500, C: 7000 } as Partial<Record<DebtorGrade, number>>,
};

export type IneligibleReason = "paid" | "overdue" | "too_small" | "too_soon" | "too_far" | "debtor_risk" | "no_history";

export interface AdvanceQuote {
  eligible: true;
  advanceQ: number;
  feeQ: number;
  /** Expected days until the customer pays: days to due plus their usual lateness. */
  expectedDays: number;
  advanceRateBp: number;
  /** Fee as an annualised rate, in basis points of the advance. */
  annualisedBp: number;
  finopsShareQ: number;
}

export function quoteAdvance(input: {
  outstandingQ: number;
  dueDate: Date;
  asOf: Date;
  grade: DebtorGrade;
  avgDaysLate: number;
}): AdvanceQuote | { eligible: false; reason: IneligibleReason } {
  const t = ADVANCE_TERMS;
  if (input.outstandingQ <= 0) return { eligible: false, reason: "paid" };
  const daysToDue = daysBetween(input.asOf, input.dueDate);
  if (daysToDue < 0) return { eligible: false, reason: "overdue" };
  if (input.outstandingQ < t.minInvoiceQ) return { eligible: false, reason: "too_small" };
  if (daysToDue < t.minDaysToDue) return { eligible: false, reason: "too_soon" };
  if (daysToDue > t.maxDaysToDue) return { eligible: false, reason: "too_far" };
  if (input.grade === "new") return { eligible: false, reason: "no_history" };
  const rate = t.advanceRateBp[input.grade];
  if (!rate) return { eligible: false, reason: "debtor_risk" };

  const advanceQ = applyBp(input.outstandingQ, rate);
  const expectedDays = daysToDue + Math.round(input.avgDaysLate);
  // Fee accrues per day on the advance: 1.8% per 30 days.
  const feeQ = Math.round((advanceQ * t.feeBpPer30Days * expectedDays) / (30 * 10000));
  const annualisedBp = Math.round((t.feeBpPer30Days * 365) / 30);
  return {
    eligible: true,
    advanceQ,
    feeQ,
    expectedDays,
    advanceRateBp: rate,
    annualisedBp,
    finopsShareQ: applyBp(feeQ, t.finopsShareBp),
  };
}
