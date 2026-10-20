import { XMLParser } from "fast-xml-parser";
import { parseDate } from "./dates";
import { parseMoney } from "./money";

// e-qaimə (electronic invoice) import from the XML export of e-taxes.gov.az.
// Element names differ between export versions and between Azerbaijani and Latin
// transliterations, so fields are found by name, the same way bank statement headers are.
// Check new export versions against a real file and add their names to FIELDS.

export interface ParsedEInvoice {
  number: string;
  issueDate: Date;
  sellerVoen: string | null;
  buyerVoen: string | null;
  buyerName: string | null;
  /** Total including VAT. */
  amountQ: number;
  vatQ: number;
  description: string | null;
}

export interface EqaimeResult {
  invoices: ParsedEInvoice[];
  /** Invoice-like elements that were missing a number, date or amount. */
  skipped: number;
  error?: "invalid_xml" | "no_invoices";
}

type Field = "series" | "number" | "date" | "sellerVoen" | "buyerVoen" | "buyerName" | "total" | "vat" | "description" | "seller" | "buyer";

const key = (s: string) => s.toLocaleLowerCase("az").replace(/[^\p{L}\p{N}]+/gu, "");

const FIELDS: Record<Field, string[]> = {
  series: ["seriya", "series", "seria", "serial"],
  number: ["nömrə", "nomre", "number", "no", "num", "qaiməno", "qaimeno", "qaimənömrəsi", "qaimenomresi", "invoiceno", "invoicenumber", "documentnumber", "docno", "serialnumber"],
  date: ["tarix", "date", "issuedate", "qaimətarixi", "qaimetarixi", "invoicedate", "documentdate", "doctarix"],
  sellerVoen: ["satıcıvöen", "saticivoen", "satıcınınvöeni", "saticininvoeni", "sellervoen", "sellertin", "sellertaxid", "supplierTin"].map(key),
  buyerVoen: ["alıcıvöen", "alicivoen", "alıcınınvöeni", "alicininvoeni", "buyervoen", "buyertin", "buyertaxid", "customertin"].map(key),
  buyerName: ["alıcınınadı", "alicininadi", "alıcıadı", "aliciadi", "buyername", "customername"].map(key),
  total: ["cəm", "cem", "yekun", "yekunməbləğ", "yekunmebleg", "ümumiməbləğ", "umumimebleg", "ədvdaxilməbləğ", "edvdaxilmebleg", "total", "totalamount", "grandtotal", "amount", "məbləğ", "mebleg", "sum"],
  vat: ["ədv", "edv", "ədvməbləği", "edvmeblegi", "vat", "vatamount", "taxamount"],
  description: ["təyinat", "teyinat", "qeyd", "description", "note", "comment"],
  seller: ["satıcı", "satici", "seller", "supplier", "təchizatçı", "techizatci"],
  buyer: ["alıcı", "alici", "buyer", "customer", "müştəri", "musteri"],
};

const PARTY_VOEN = ["vöen", "voen", "tin", "taxid", "vöeni", "voeni"];
const PARTY_NAME = ["ad", "adı", "adi", "name", "fullname", "title"];

type Node = Record<string, unknown>;

function fieldOf(k: string): Field | null {
  const n = key(k);
  for (const f of Object.keys(FIELDS) as Field[]) if (FIELDS[f].includes(n)) return f;
  return null;
}

const isNode = (v: unknown): v is Node => typeof v === "object" && v !== null && !Array.isArray(v);

/** Text of a leaf, or the "#text" of an element that also has attributes. */
function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return String(v).trim() || null;
  if (isNode(v) && "#text" in v) return text(v["#text"]);
  return null;
}

function fields(node: Node): Partial<Record<Field, unknown>> {
  const out: Partial<Record<Field, unknown>> = {};
  for (const [k, v] of Object.entries(node)) {
    const f = fieldOf(k);
    if (f && out[f] === undefined) out[f] = v;
  }
  return out;
}

function party(v: unknown): { voen: string | null; name: string | null } {
  if (!isNode(v)) return { voen: null, name: text(v) };
  let voen: string | null = null;
  let name: string | null = null;
  for (const [k, val] of Object.entries(v)) {
    const n = key(k);
    if (!voen && PARTY_VOEN.includes(n)) voen = text(val);
    if (!name && PARTY_NAME.includes(n)) name = text(val);
  }
  return { voen, name };
}

const cleanVoen = (s: string | null) => {
  const d = s?.replace(/\D/g, "") ?? "";
  return d.length === 10 ? d : null;
};

const money = (v: unknown) => {
  const s = text(v);
  return s === null ? null : parseMoney(s);
};

/** Sum a money field over line items: any child arrays or elements that carry their own amount. */
function sumItems(node: Node, f: "total" | "vat"): number | null {
  let sum: number | null = null;
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!isNode(v)) return;
    const own = fields(v)[f];
    const q = own === undefined ? null : money(own);
    if (q !== null) sum = (sum ?? 0) + q;
    else Object.values(v).forEach(visit);
  };
  for (const v of Object.values(node)) if (Array.isArray(v) || isNode(v)) visit(v);
  return sum;
}

type Candidate = { invoice: ParsedEInvoice } | { invalid: true } | null;

function asInvoice(node: Node): Candidate {
  const f = fields(node);
  if (f.number === undefined || f.date === undefined) return null;
  // A line item can have a number and a date too; an invoice also names a party or a total.
  if (f.total === undefined && f.buyer === undefined && f.buyerVoen === undefined && f.seller === undefined) return null;

  const series = text(f.series);
  const num = text(f.number);
  const issueDate = parseDate(text(f.date));
  const amountQ = money(f.total) ?? sumItems(node, "total");
  if (!num || !issueDate || amountQ === null || amountQ <= 0) return { invalid: true };

  const seller = party(f.seller);
  const buyer = party(f.buyer);
  const vatQ = money(f.vat) ?? sumItems(node, "vat") ?? 0;
  const number = series && !num.toUpperCase().startsWith(series.toUpperCase()) ? `${series}${num}` : num;
  return {
    invoice: {
      number,
      issueDate,
      sellerVoen: cleanVoen(text(f.sellerVoen) ?? seller.voen),
      buyerVoen: cleanVoen(text(f.buyerVoen) ?? buyer.voen),
      buyerName: text(f.buyerName) ?? buyer.name,
      amountQ,
      vatQ: vatQ > 0 && vatQ < amountQ ? vatQ : 0,
      description: text(f.description),
    },
  };
}

export function parseEqaimeXml(xml: string): EqaimeResult {
  let doc: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      // Keep leading zeros in VÖEN and invoice numbers.
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
    });
    doc = parser.parse(xml.replace(/^﻿/, ""), true);
  } catch {
    return { invoices: [], skipped: 0, error: "invalid_xml" };
  }

  const invoices: ParsedEInvoice[] = [];
  let skipped = 0;
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!isNode(v)) return;
    const c = asInvoice(v);
    if (c && "invoice" in c) invoices.push(c.invoice);
    else if (c) skipped++;
    // Do not look for invoices inside an invoice's own line items.
    else Object.values(v).forEach(walk);
  };
  walk(doc);
  if (!invoices.length && !skipped) return { invoices, skipped, error: "no_invoices" };
  return { invoices, skipped };
}
