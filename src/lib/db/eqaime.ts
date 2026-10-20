import { XMLParser } from "fast-xml-parser";
import { parseDate } from "../domain/dates";
import { parseMoney } from "../domain/money";

// e-qaimə XML import. The parser looks for invoice elements and reads their fields by name,
// in Azerbaijani or English, because the exact export layout from the State Tax Service
// has not been checked against a real file yet. Unknown layouts are reported, not guessed.

export interface EqaimeInvoice {
  number: string;
  issueDate: Date;
  amountQ: number;
  vatQ: number;
  customerName: string;
  customerVoen: string | null;
}

const FIELD_NAMES = {
  number: ["number", "qaimenomresi", "nomre", "id", "invoicenumber", "qaiməniomresi"],
  date: ["date", "tarix", "issuedate", "qaiməniTarixi", "qaimetarixi"],
  amount: ["amount", "total", "mebleg", "cemi", "totalamount"],
  vat: ["vat", "edv", "vatamount"],
  customer: ["customername", "buyername", "alici", "customer", "alicininadi"],
  voen: ["customervoen", "buyervoen", "voen", "alicivoen"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-zəöüçşığ0-9]/gi, "");

function pick(obj: Record<string, unknown>, names: string[]): unknown {
  const entries = Object.entries(obj).map(([k, v]) => [norm(k), v] as const);
  for (const name of names) {
    const hit = entries.find(([k]) => k === norm(name));
    if (hit) return hit[1];
  }
  return undefined;
}

function findInvoiceNodes(node: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((n) => findInvoiceNodes(n, out));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const keys = Object.keys(o).map(norm);
    if (keys.some((k) => FIELD_NAMES.number.includes(k)) && keys.some((k) => FIELD_NAMES.amount.includes(k))) out.push(o);
    else Object.values(o).forEach((v) => findInvoiceNodes(v, out));
  }
  return out;
}

export function parseEqaime(xml: string): { invoices: EqaimeInvoice[]; skipped: number } {
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true }).parse(xml);
  const nodes = findInvoiceNodes(parsed);
  const invoices: EqaimeInvoice[] = [];
  let skipped = 0;
  for (const n of nodes) {
    const text = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? String((v as Record<string, unknown>)["#text"] ?? "") : String(v));
    const number = text(pick(n, FIELD_NAMES.number)).trim();
    const issueDate = parseDate(text(pick(n, FIELD_NAMES.date)));
    const amountQ = parseMoney(text(pick(n, FIELD_NAMES.amount)));
    if (!number || !issueDate || amountQ === null || amountQ <= 0) {
      skipped++;
      continue;
    }
    const vatQ = parseMoney(text(pick(n, FIELD_NAMES.vat))) ?? 0;
    const voen = text(pick(n, FIELD_NAMES.voen)).replace(/\D/g, "");
    invoices.push({
      number,
      issueDate,
      amountQ,
      vatQ: Math.min(Math.max(vatQ, 0), amountQ),
      customerName: text(pick(n, FIELD_NAMES.customer)).trim() || "e-qaimə müştərisi",
      customerVoen: voen.length === 10 ? voen : null,
    });
  }
  return { invoices, skipped };
}
