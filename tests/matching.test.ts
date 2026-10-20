import { describe, expect, it } from "vitest";
import { suggestMatches, type OpenInvoice } from "@/lib/domain/matching";
import { parseDate } from "@/lib/domain/dates";

const invoices: OpenInvoice[] = [
  { id: "i1", number: "FT-101", issueDate: parseDate("2026-10-01")!, outstandingQ: 50000, customerName: "Nur Market", customerVoen: "1234567890" },
  { id: "i2", number: "FT-1010", issueDate: parseDate("2026-10-01")!, outstandingQ: 20000, customerName: "Kür LLC", customerVoen: null },
];

describe("suggestMatches", () => {
  it("ranks by invoice number, amount and VOEN", () => {
    const s = suggestMatches(
      { date: parseDate("2026-10-15")!, amountQ: 50000, description: "Ödəniş FT-101", counterparty: "Nur Market", counterpartyVoen: "1234567890" },
      invoices,
    );
    expect(s[0].invoiceId).toBe("i1");
    expect(s[0].reasons).toEqual(expect.arrayContaining(["exact_amount", "invoice_number", "voen"]));
  });

  it("does not match FT-101 inside FT-1010", () => {
    const s = suggestMatches({ date: parseDate("2026-10-15")!, amountQ: 1, description: "FT-1010", counterparty: null, counterpartyVoen: null }, invoices);
    expect(s.find((x) => x.invoiceId === "i1")).toBeUndefined();
  });
});
