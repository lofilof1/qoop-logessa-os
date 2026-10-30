import { stableBriefJson } from "../src/lib/studio";
import { describe, it, expect } from "vitest";
import {
  briefSchema,
  initialBrief,
  plannedCrop,
  structuredBrief,
  studioWarnings,
} from "../src/lib/studio";
import catalog from "../data/lessons/catalog.json";
describe("lesson based brief", () => {
  it("validates all modes without invoking a model", () => {
    for (const mode of [
      "pattern",
      "mural",
      "continuous",
      "motif",
      "edit",
    ] as const)
      expect(briefSchema.safeParse({ ...initialBrief(), mode }).success).toBe(
        true,
      );
  });
  it("requires a custom value when Other is selected", () => {
    const d = initialBrief();
    d.values.primary = "__other__";
    expect(briefSchema.safeParse(d).success).toBe(false);
    d.custom.primary = "Nar ağacı";
    expect(briefSchema.safeParse(d).success).toBe(true);
  });
  it("rejects fabricated predefined options and invalid crop", () => {
    const d = initialBrief();
    d.values.primary = "unknown";
    expect(briefSchema.safeParse(d).success).toBe(false);
    expect(
      briefSchema.safeParse({
        ...initialBrief(),
        mode: "continuous",
        cropWidth: 500,
      }).success,
    ).toBe(false);
  });
  it("keeps teaching examples distinct from measurements", () => {
    const b = structuredBrief(initialBrief());
    expect(b.validation.imageInspected).toBe(false);
    expect(b.validation.seamTest).toBe("NOT_RUN");
    expect(catalog.rules.find((r) => r.id === "density-examples")?.kind).toBe(
      "example",
    );
  });
  it("computes a bounded full height purchase window", () => {
    const d = {
      ...initialBrief(),
      mode: "continuous" as const,
      cropWidth: 150,
      cropOffset: 100,
    };
    expect(plannedCrop(d)).toEqual({ left: 250, width: 150 });
    expect(studioWarnings(d).some((s) => s.includes("garanti"))).toBe(true);
  });
  it("records only valid PDF pages and explicitly missing lesson", () => {
    expect(catalog.source.pageCount).toBe(50);
    expect(catalog.lessons).toHaveLength(20);
    expect(catalog.missingLessons).toEqual([]);
    expect(catalog.totalPageCount).toBe(52);
    expect(catalog.fields.every((f) => f.page >= 1 && f.page <= 50)).toBe(true);
  });
});

it("ignores JSON property ordering for cache identity", () => {
  expect(stableBriefJson({ a: 1, b: { x: 2, y: 3 } })).toBe(
    stableBriefJson({ b: { y: 3, x: 2 }, a: 1 }),
  );
});

it("loads v1 saved briefs without new collection fields", () => {
  const old = initialBrief();
  old.catalogVersion = "lessons-v1";
  for (const f of catalog.fields.filter((f) => f.optional))
    delete old.values[f.id];
  expect(briefSchema.safeParse(old).success).toBe(true);
});
