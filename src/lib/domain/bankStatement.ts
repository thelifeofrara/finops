import Papa from "papaparse";
import { parseDate } from "./dates";
import { parseMoney } from "./money";

// Bank statement import (CSV or Excel export from the bank's internet banking).
// Columns are found by header name in Azerbaijani, English or Russian, so no manual mapping
// is needed for the usual ABB, Kapital Bank, PASHA and Leobank exports.

export type Cell = string | number | boolean | Date | null | undefined;

export interface ParsedTransaction {
  date: Date;
  amountQ: number;
  description: string;
  counterparty: string | null;
  counterpartyVoen: string | null;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  skippedRows: number;
  error?: "no_header" | "no_amount_column" | "empty";
}

type Field = "date" | "amount" | "credit" | "debit" | "description" | "counterparty" | "voen";

const HEADERS: Record<Field, string[]> = {
  date: ["tarix", "əməliyyat tarixi", "emeliyyat tarixi", "date", "transaction date", "value date", "дата"],
  amount: ["məbləğ", "mebleg", "amount", "сумма"],
  credit: ["mədaxil", "medaxil", "kredit", "credit", "daxilolma", "money in", "in", "приход", "кредит"],
  debit: ["məxaric", "mexaric", "debet", "debit", "çıxış", "cixis", "money out", "out", "расход", "дебет"],
  description: ["təyinat", "teyinat", "ödənişin təyinatı", "təyinatı", "açıqlama", "aciqlama", "description", "details", "purpose", "назначение", "описание"],
  counterparty: ["qarşı tərəf", "qarsi teref", "göndərən", "gonderen", "alan", "ödəyici", "counterparty", "payer", "beneficiary", "контрагент"],
  voen: ["vöen", "voen", "qarşı tərəfin vöen", "tin", "инн"],
};

const norm = (s: unknown) =>
  String(s ?? "")
    .toLocaleLowerCase("az")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function matchHeader(cell: unknown): Field | null {
  const h = norm(cell);
  if (!h) return null;
  // Exact match first, then "starts with" (e.g. "məbləğ (azn)").
  for (const f of Object.keys(HEADERS) as Field[]) if (HEADERS[f].includes(h)) return f;
  for (const f of Object.keys(HEADERS) as Field[]) if (HEADERS[f].some((k) => k.length > 3 && h.startsWith(k))) return f;
  // "Qarşı tərəfin VÖEN-i" contains vöen; check before counterparty.
  if (/\bv[öo]en\b|\btin\b/.test(h)) return "voen";
  if (HEADERS.counterparty.some((k) => h.includes(k))) return "counterparty";
  return null;
}

export function parseRows(rows: Cell[][]): ParseResult {
  if (!rows.length) return { transactions: [], skippedRows: 0, error: "empty" };
  let headerIdx = -1;
  let cols: Partial<Record<Field, number>> = {};
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const found: Partial<Record<Field, number>> = {};
    rows[i].forEach((c, j) => {
      const f = matchHeader(c);
      if (f && found[f] === undefined) found[f] = j;
    });
    if (found.date !== undefined && (found.amount !== undefined || found.credit !== undefined || found.debit !== undefined)) {
      headerIdx = i;
      cols = found;
      break;
    }
  }
  if (headerIdx < 0) return { transactions: [], skippedRows: rows.length, error: "no_header" };
  if (cols.amount === undefined && cols.credit === undefined && cols.debit === undefined) {
    return { transactions: [], skippedRows: rows.length, error: "no_amount_column" };
  }

  const get = (row: Cell[], f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!]);
  const money = (c: Cell) => (c instanceof Date || typeof c === "boolean" ? null : parseMoney(c ?? null));
  const out: ParsedTransaction[] = [];
  let skipped = 0;
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;
    const dateCell = get(row, "date");
    const date = parseDate(dateCell as string | Date | number | null);
    let amountQ: number | null = null;
    if (cols.credit !== undefined || cols.debit !== undefined) {
      const credit = money(get(row, "credit")) ?? 0;
      const debit = money(get(row, "debit")) ?? 0;
      amountQ = Math.abs(credit) - Math.abs(debit);
      if (amountQ === 0 && cols.amount !== undefined) amountQ = money(get(row, "amount"));
    } else {
      amountQ = money(get(row, "amount"));
    }
    if (!date || amountQ === null || amountQ === 0) {
      skipped++;
      continue;
    }
    const text = (f: Field) => {
      const v = get(row, f);
      const s = v === null || v === undefined ? "" : String(v).trim();
      return s || null;
    };
    const voen = text("voen")?.replace(/\D/g, "") || null;
    out.push({
      date,
      amountQ,
      description: text("description") ?? "",
      counterparty: text("counterparty"),
      counterpartyVoen: voen && voen.length === 10 ? voen : null,
    });
  }
  return { transactions: out, skippedRows: skipped };
}

export function parseCsv(text: string): ParseResult {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true, delimiter: "" });
  return parseRows(res.data);
}

export function dedupeHash(tx: ParsedTransaction): string {
  const key = `${tx.date.toISOString().slice(0, 10)}|${tx.amountQ}|${tx.description.trim().toLowerCase()}|${tx.counterparty ?? ""}`;
  // FNV-1a, enough to spot the same row uploaded twice.
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}-${key.length}`;
}
