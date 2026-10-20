import { describe, expect, it } from "vitest";
import { dictionaries, fmt } from "@/lib/i18n";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("i18n", () => {
  it("has the same keys in every language, none empty", () => {
    expect(keys(dictionaries.en).sort()).toEqual(keys(dictionaries.az).sort());
    for (const d of Object.values(dictionaries)) {
      for (const k of keys(d)) expect(k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], d)).not.toBe("");
    }
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fmt("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});
