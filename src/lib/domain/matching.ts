import { daysBetween } from "./dates";

// Suggest which open invoice an incoming bank payment settles. The owner confirms every match.

export interface OpenInvoice {
  id: string;
  number: string;
  issueDate: Date;
  outstandingQ: number;
  customerName: string;
  customerVoen: string | null;
}

export interface IncomingPayment {
  date: Date;
  amountQ: number;
  description: string;
  counterparty: string | null;
  counterpartyVoen: string | null;
}

export interface MatchSuggestion {
  invoiceId: string;
  score: number;
  amountQ: number;
  reasons: MatchReason[];
}

export type MatchReason = "exact_amount" | "invoice_number" | "voen" | "name" | "partial_amount";

/** Minimum score for a suggestion to be shown. */
export const MATCH_THRESHOLD = 40;

const normalize = (s: string) =>
  s
    .toLocaleLowerCase("az")
    .replace(/\b(mmc|asc|qsc|llc|ltd|fərdi sahibkar|f\/s)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function nameMatches(customer: string, text: string): boolean {
  const c = normalize(customer);
  if (c.length < 3) return false;
  return normalize(text).includes(c);
}

function numberMentioned(number: string, text: string): boolean {
  const n = number.toLowerCase().replace(/\s+/g, "");
  if (n.length < 2) return false;
  const t = text.toLowerCase().replace(/\s+/g, "");
  const idx = t.indexOf(n);
  if (idx < 0) return false;
  // Avoid matching "12" inside "123".
  const after = t[idx + n.length];
  const before = t[idx - 1];
  return !(after && /\d/.test(after)) && !(before && /\d/.test(before) && /^\d/.test(n));
}

export function suggestMatches(payment: IncomingPayment, invoices: OpenInvoice[]): MatchSuggestion[] {
  if (payment.amountQ <= 0) return [];
  const text = `${payment.description} ${payment.counterparty ?? ""}`;
  const out: MatchSuggestion[] = [];
  for (const inv of invoices) {
    if (inv.outstandingQ <= 0) continue;
    if (daysBetween(inv.issueDate, payment.date) < -3) continue; // paid before it was issued
    const reasons: MatchReason[] = [];
    let score = 0;
    if (payment.amountQ === inv.outstandingQ) {
      score += 50;
      reasons.push("exact_amount");
    } else if (payment.amountQ < inv.outstandingQ) {
      score += 10;
      reasons.push("partial_amount");
    }
    if (numberMentioned(inv.number, text)) {
      score += 40;
      reasons.push("invoice_number");
    }
    if (inv.customerVoen && payment.counterpartyVoen && inv.customerVoen === payment.counterpartyVoen) {
      score += 35;
      reasons.push("voen");
    } else if (nameMatches(inv.customerName, text)) {
      score += 20;
      reasons.push("name");
    }
    if (score >= MATCH_THRESHOLD) {
      out.push({ invoiceId: inv.id, score, amountQ: Math.min(payment.amountQ, inv.outstandingQ), reasons });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
