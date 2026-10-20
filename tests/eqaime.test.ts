import { describe, expect, it } from "vitest";
import { parseEqaime } from "@/lib/db/eqaime";

describe("parseEqaime", () => {
  it("reads invoices by field name, in Azerbaijani or English", () => {
    const xml = `<?xml version="1.0"?>
      <qaimeler>
        <qaime>
          <nomre>EQ-1001</nomre><tarix>2026-10-03</tarix><mebleg>118,00</mebleg><edv>18,00</edv>
          <alici>Nur Market</alici><voen>1234567890</voen>
        </qaime>
        <invoice>
          <number>EQ-1002</number><date>05.10.2026</date><total>50.00</total>
          <customerName>Kür MMC</customerName>
        </invoice>
        <note>no amount here</note>
      </qaimeler>`;
    const r = parseEqaime(xml);
    expect(r.invoices).toHaveLength(2);
    expect(r.invoices[0]).toMatchObject({ number: "EQ-1001", amountQ: 11800, vatQ: 1800, customerVoen: "1234567890" });
    expect(r.invoices[1]).toMatchObject({ number: "EQ-1002", amountQ: 5000, vatQ: 0, customerName: "Kür MMC" });
  });

  it("returns nothing for an unknown layout instead of guessing", () => {
    expect(parseEqaime("<a><b>1</b></a>").invoices).toEqual([]);
  });
});
