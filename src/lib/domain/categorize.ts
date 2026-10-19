import type { RuleDirection } from "@prisma/client";
import { KEYWORD_RULES } from "./chart";

// Auto-categorisation of bank transactions, most confident source first:
// 1. a rule learned from the owner's own past choice for this counterparty (0.95)
// 2. an incoming payment from a known customer → receivables (0.9)
// 3. a built-in keyword in the description (0.7)
// Anything else stays uncategorised for the owner to pick.

export interface LearnedRule {
  pattern: string;
  matchOn: string;
  direction: RuleDirection;
  accountCode: string;
}

export interface TxForCategorising {
  amountQ: number;
  description: string;
  counterparty: string | null;
  counterpartyVoen: string | null;
}

export interface Categorisation {
  accountCode: string;
  confidence: number;
  source: "LEARNED" | "CUSTOMER" | "RULE";
}

export const normalizeParty = (s: string) =>
  s.toLocaleLowerCase("az").replace(/["'«»]/g, "").replace(/\s+/g, " ").trim();

const directionOk = (dir: RuleDirection, amountQ: number) =>
  dir === "ANY" || (dir === "IN" ? amountQ > 0 : amountQ < 0);

export function categorize(
  tx: TxForCategorising,
  ctx: { learned: LearnedRule[]; customerVoens: Set<string>; customerNames: Set<string> },
): Categorisation | null {
  const party = tx.counterparty ? normalizeParty(tx.counterparty) : null;
  const desc = tx.description.toLocaleLowerCase("az");

  for (const r of ctx.learned) {
    if (!directionOk(r.direction, tx.amountQ)) continue;
    if (r.matchOn === "counterparty" && party && party === r.pattern) {
      return { accountCode: r.accountCode, confidence: 0.95, source: "LEARNED" };
    }
    if (r.matchOn === "voen" && tx.counterpartyVoen && tx.counterpartyVoen === r.pattern) {
      return { accountCode: r.accountCode, confidence: 0.95, source: "LEARNED" };
    }
  }

  if (tx.amountQ > 0) {
    const knownVoen = tx.counterpartyVoen && ctx.customerVoens.has(tx.counterpartyVoen);
    const knownName = party && ctx.customerNames.has(party);
    if (knownVoen || knownName) return { accountCode: "211", confidence: 0.9, source: "CUSTOMER" };
  }

  for (const rule of KEYWORD_RULES) {
    if (!directionOk(rule.direction, tx.amountQ)) continue;
    if (rule.keywords.some((k) => desc.includes(k) || (party?.includes(k) ?? false))) {
      return { accountCode: rule.code, confidence: 0.7, source: "RULE" };
    }
  }
  return null;
}
