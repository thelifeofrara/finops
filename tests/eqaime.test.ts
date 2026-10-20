import { describe, expect, it } from "vitest";
import { parseEqaimeXml } from "@/lib/domain/eqaime";
import { isoDate } from "@/lib/domain/dates";

describe("parseEqaimeXml", () => {
  it("reads Azerbaijani element names, nested parties and keeps leading zeros", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <Qaimeler>
        <Qaime>
          <Seriya>MT2610</Seriya>
          <Nomre>0012345</Nomre>
          <Tarix>05.10.2026</Tarix>
          <Satici><VOEN>1000000001</VOEN><Ad>Demo Biznes</Ad></Satici>
          <Alici><VOEN>0123456789</VOEN><Ad>Nur Market MMC</Ad></Alici>
          <Mallar>
            <Mal><No>1</No><Ad>Xidmət</Ad><Mebleg>1000.00</Mebleg><EDV>180.00</EDV></Mal>
          </Mallar>
          <Yekun>1180,00</Yekun>
          <EDV>180,00</EDV>
        </Qaime>
      </Qaimeler>`;
    const r = parseEqaimeXml(xml);
    expect(r.error).toBeUndefined();
    expect(r.invoices).toHaveLength(1);
    const inv = r.invoices[0];
    expect(inv.number).toBe("MT26100012345");
    expect(isoDate(inv.issueDate)).toBe("2026-10-05");
    expect(inv.sellerVoen).toBe("1000000001");
    expect(inv.buyerVoen).toBe("0123456789");
    expect(inv.buyerName).toBe("Nur Market MMC");
    expect(inv.amountQ).toBe(118000);
    expect(inv.vatQ).toBe(18000);
  });

  it("reads English names, attributes and sums line items when there is no total", () => {
    const xml = `<Invoices>
      <Invoice number="INV-7" date="2026-09-30" buyerTin="1234567890" buyerName="Kür LLC">
        <Items>
          <Item><Amount>50.00</Amount><Vat>9.00</Vat></Item>
          <Item><Amount>68.00</Amount><Vat>0</Vat></Item>
        </Items>
      </Invoice>
      <Invoice number="INV-8" date="2026-09-31" buyerTin="1234567890"><Total>10</Total></Invoice>
    </Invoices>`;
    const r = parseEqaimeXml(xml);
    expect(r.invoices).toHaveLength(1);
    expect(r.invoices[0]).toMatchObject({ number: "INV-7", buyerVoen: "1234567890", buyerName: "Kür LLC", amountQ: 11800, vatQ: 900 });
    // 31 September does not exist.
    expect(r.skipped).toBe(1);
  });

  it("reports broken XML and files without invoices", () => {
    expect(parseEqaimeXml("<a><b></a>").error).toBe("invalid_xml");
    expect(parseEqaimeXml("<root><x>1</x></root>").error).toBe("no_invoices");
  });
});
