import { it, expect } from "vitest";
import { composeStudio } from "../src/lib/studio-composer";
import {
  initialBrief,
  selected,
  briefSchema,
  currentCreativePlan,
  structuredBrief,
} from "../src/lib/studio";
import { studioPrompts } from "../src/lib/provider-prompts";
it("makes valid mode-specific choices, never mutates input and keeps main motif, constraints, dimensions and ratio", () => {
  for (const mode of [
    "mural",
    "pattern",
    "continuous",
    "motif",
    "edit",
  ] as const) {
    const d = {
      ...initialBrief(),
      mode,
      notes: "Keep my exact subject",
      wallWidth: 480,
      wallHeight: 320,
    };
    d.values.primary = "__other__";
    d.custom.primary = "Nar ağacı";
    d.values.aspect = "__other__";
    d.custom.aspect = "7:5";
    const before = structuredClone(d),
      next = composeStudio(d);
    expect(d).toEqual(before);
    expect(briefSchema.safeParse(next).success).toBe(true);
    expect(selected(next, "primary")).toBe("Nar ağacı");
    expect(selected(next, "aspect")).toBe(mode === "pattern" ? "1:1" : "7:5");
    expect(next.notes).toBe(d.notes);
    expect([
      next.wallWidth,
      next.wallHeight,
      next.cropWidth,
      next.targetPpi,
    ]).toEqual([d.wallWidth, d.wallHeight, d.cropWidth, d.targetPpi]);
    expect(currentCreativePlan(next)).toBeDefined();
    expect(structuredBrief(next).creativePlan).toBeDefined();
    const prompts = studioPrompts(next);
    expect(prompts.midjourney).toContain(
      mode === "pattern" ? "--ar 1:1" : "--ar 7:5",
    );
    expect(prompts.midjourney.includes("--tile")).toBe(mode === "pattern");
    expect(prompts.chatgpt).toContain("Art direction:");
  }
});
it("single motif has no supports, lake or horizon instruction", () => {
  const d = initialBrief();
  d.mode = "motif";
  const x = composeStudio(d);
  expect(selected(x, "secondary")).toBe("Yok");
  expect(selected(x, "filler")).toBe("Yok");
  const p = studioPrompts(x).chatgpt;
  expect(p).toContain("exactly one isolated main motif");
  expect(p).not.toContain("water area target");
  expect(p).not.toContain("horizon 45%");
});
it("unknown custom subject never acquires invented ducks, trees or lakes", () => {
  const d = initialBrief();
  d.mode = "mural";
  d.values.primary = "__other__";
  d.custom.primary = "Mavi seramik fincan";
  const x = composeStudio(d);
  expect(selected(x, "primary")).toBe(d.custom.primary);
  expect(selected(x, "secondary")).toBe("Yok");
  expect(selected(x, "secondaryExtra")).toBe("Yok");
  expect(x.waterArea).toBe(0);
});
it("supports locked personal colors and technical style, and can propose a mode ratio when permitted", () => {
  const d = initialBrief();
  d.values.palette = "__other__";
  d.custom.palette = "Indigo and rust";
  d.values.medium = "Guaj";
  const x = composeStudio(d, { preserveStyle: true, preserveAspect: false });
  expect(selected(x, "palette")).toBe("Indigo and rust");
  expect(selected(x, "medium")).toBe("Guaj");
  expect(selected(x, "aspect")).toBe("1:1");
});
it("edits preserve unrelated features and stale directions cannot override manual changes", () => {
  const d = initialBrief();
  d.mode = "edit";
  d.values.problem = "Çok kalabalık";
  d.values.secondary = "Ördek";
  const x = composeStudio(d);
  expect(x.density).toBeLessThan(d.density);
  expect(x.values).toEqual(d.values);
  const mural = composeStudio({ ...initialBrief(), mode: "mural" });
  mural.values.secondary = "Ördek";
  expect(currentCreativePlan(mural)).toBeUndefined();
  expect(studioPrompts(mural).chatgpt).not.toContain("Art direction:");
});
it("does not promise arbitrary seamless-mural crops and refuses empty custom main motif", () => {
  const d = initialBrief();
  d.mode = "continuous";
  const x = composeStudio(d);
  expect(selected(x, "cropPolicy")).toBe("Onaylı sabit kesitler");
  expect(studioPrompts(x).chatgpt).toContain(
    "require inspection after generation",
  );
  d.values.primary = "__other__";
  d.custom.primary = "";
  expect(() => composeStudio(d)).toThrow("ana motif");
});
