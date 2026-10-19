import { describe, expect, it } from "vitest";
import { categorize } from "@/lib/domain/categorize";

const ctx = { learned: [], customerVoens: new Set<string>(["1234567890"]), customerNames: new Set<string>(["nur market"]) };

describe("categorize", () => {
  it("treats incoming money from a known customer as receivables", () => {
    expect(categorize({ amountQ: 5000, description: "ödəniş", counterparty: "Nur Market", counterpartyVoen: null }, ctx)?.accountCode).toBe("211");
  });
  it("uses built-in keywords for outgoing payments", () => {
    expect(categorize({ amountQ: -20000, description: "Ofis icarəsi, aprel", counterparty: null, counterpartyVoen: null }, ctx)?.accountCode).toBe("7212");
  });
  it("prefers a learned rule over keywords", () => {
    const learned = [{ pattern: "azercell mmc", matchOn: "counterparty", direction: "OUT" as const, accountCode: "711" }];
    const r = categorize({ amountQ: -1000, description: "internet", counterparty: "Azercell MMC", counterpartyVoen: null }, { ...ctx, learned });
    expect(r).toMatchObject({ accountCode: "711", source: "LEARNED" });
  });
  it("returns null when nothing matches", () => {
    expect(categorize({ amountQ: -100, description: "xyz", counterparty: null, counterpartyVoen: null }, ctx)).toBeNull();
  });
});
