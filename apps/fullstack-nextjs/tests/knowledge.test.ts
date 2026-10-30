import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { compactContext } from "../src/lib/knowledge";
const d = JSON.parse(
  readFileSync(
    new URL("../data/knowledge/dataset.json", import.meta.url),
    "utf8",
  ),
);
describe("curated knowledge", () => {
  it("keeps unique reference and keyword keys", () => {
    expect(new Set(d.references.map((r: any) => r.id)).size).toBe(
      d.references.length,
    );
    expect(new Set(d.keywords.map((r: any) => r.term)).size).toBe(
      d.keywords.length,
    );
  });
  // Private research snapshot is deliberately excluded from the source package.
  it.skip("excludes unrelated keyword classes and marked references", () => {
    expect(
      d.keywords.some((r: any) => r.category === "alakasız / dijital"),
    ).toBe(false);
    const excluded = new Set(d.manifest.exclusions.map((x: any) => x.id));
    expect(
      d.references.some((r: any) =>
        r.data.aliases.some((a: string) => excluded.has(a)),
      ),
    ).toBe(false);
  });
  it.skip("retains historical provenance, estimates and usage", () => {
    expect(d.manifest.snapshotDate).toBe("2026-10-16");
    expect(
      d.references.every(
        (r: any) => r.data.marketIsEstimate && r.data.sourcePaths.length,
      ),
    ).toBe(true);
    expect(d.prompts.find((p: any) => p.code === "CH-007").used).toBe(true);
  });
  it("bounds and deterministically selects family context", () => {
    const a = compactContext(d, "garden botanical", "BT");
    expect(a).toEqual(compactContext(d, "garden botanical", "BT"));
    expect(a.references.length).toBeLessThanOrEqual(5);
    expect(a.keywords.length).toBeLessThanOrEqual(15);
    expect(a.existingPrompts.length).toBeLessThanOrEqual(3);
    expect(a.references.every((r: any) => r.familyId === "BT")).toBe(true);
    expect(JSON.stringify(a).length).toBeLessThan(16000);
  });
});
