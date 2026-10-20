import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/domain/bankStatement";

describe("parseCsv", () => {
  it("reads an Azerbaijani statement with separate credit and debit columns", () => {
    const csv = [
      "Tarix;Mədaxil;Məxaric;Təyinat;Qarşı tərəf;VÖEN",
      "10.10.2026;500,00;;FT-101 ödəniş;Nur Market;1234567890",
      "11.10.2026;;120,50;Ofis icarəsi;Landlord MMC;",
      "12.10.2026;;;boş;;",
    ].join("\n");
    const r = parseCsv(csv);
    expect(r.error).toBeUndefined();
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]).toMatchObject({ amountQ: 50000, counterpartyVoen: "1234567890" });
    expect(r.transactions[1].amountQ).toBe(-12050);
  });
});
