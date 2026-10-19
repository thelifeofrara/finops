// Money is always integer qəpik (1 ₼ = 100 qəpik) so sums never drift.

/** Parse "1 234,56", "1,234.56", "1234.5" or "-50" into qəpik. Returns null if it is not a number. */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.trim().replace(/[₼\s ]|AZN|manat/gi, "");
  if (!s) return null;
  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/^[-+(]|\)$/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // A single comma followed by 1-2 digits is a decimal comma; otherwise a thousands separator.
    s = /,\d{1,2}$/.test(s) && s.split(",").length === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const q = Number(whole) * 100 + Number((frac + "00").slice(0, 2)) + (Number(frac[2] ?? 0) >= 5 ? 1 : 0);
  return negative ? -q : q;
}

/** Format qəpik as "1 234,56 ₼". */
export function formatMoney(q: number, opts: { sign?: boolean } = {}): string {
  const negative = q < 0;
  const abs = Math.abs(q);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = (abs % 100).toString().padStart(2, "0");
  const prefix = negative ? "−" : opts.sign && q > 0 ? "+" : "";
  return `${prefix}${whole},${frac} ₼`;
}

/** Plain decimal string for form inputs, e.g. 123456 -> "1234.56". */
export function toDecimalString(q: number): string {
  const negative = q < 0;
  const abs = Math.abs(q);
  return `${negative ? "-" : ""}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, "0")}`;
}

/** Multiply by a basis-point rate (200 = 2%) and round half up. */
export function applyBp(q: number, bp: number): number {
  return Math.round((q * bp) / 10000);
}
