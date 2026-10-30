import { describe, it, expect } from "vitest";
import {
  fieldOptions,
  normalizeOption,
  marketOptions,
} from "../src/lib/studio-options";
import { briefSchema, initialBrief, structuredBrief } from "../src/lib/studio";
import { productionPrompt } from "../src/lib/studio-production";
describe("evidence based options", () => {
  it("keeps defaults, enriches relevant categories, and deduplicates personal entries", () => {
    const opts = fieldOptions("primary", [
      { fieldId: "primary", value: " AĞAÇ " },
      { fieldId: "primary", value: "Nar çiçeği" },
    ]);
    expect(opts[0]).toBe("Zeytin dalı");
    expect(opts).toContain("Manolya");
    expect(opts.filter((x) => normalizeOption(x) === "ağaç")).toHaveLength(1);
    expect(opts).toContain("Nar çiçeği");
    expect(fieldOptions("palette").length).toBeGreaterThan(20);
  });
  it("backs every market suggestion with at least three keyword matches", () => {
    for (const rows of Object.values(marketOptions.fields))
      for (const row of rows)
        expect(row.keywordCount).toBeGreaterThanOrEqual(3);
  });
  it("validates new market and personal selections and carries them to production", () => {
    const d = initialBrief();
    d.values.primary = "Manolya";
    expect(briefSchema.safeParse(d).success).toBe(true);
    d.values.primary = "Nar çiçeği";
    expect(briefSchema.safeParse(d).success).toBe(false);
    d.custom.primary = "Nar çiçeği";
    expect(briefSchema.safeParse(d).success).toBe(true);
    expect(productionPrompt(d)).toContain("Nar çiçeği");
    expect(
      structuredBrief(d).selections.find((x) => x.id === "primary")?.value,
    ).toBe("Nar çiçeği");
  });
});
