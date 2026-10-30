import { it, expect } from "vitest";
import {
  studioPrompts,
  aspectParameter,
  providerPrompts,
  reviewProviderPrompts,
} from "../src/lib/provider-prompts";
import { initialBrief } from "../src/lib/studio";
it("retains the same chosen motif while using provider-specific syntax", () => {
  const d = initialBrief();
  d.mode = "pattern";
  d.values.primary = "__other__";
  d.custom.primary = "Manolya";
  d.values.aspect = "4:3";
  const p = studioPrompts(d);
  expect(p.chatgpt).toContain("Manolya");
  expect(p.midjourney).toContain("Manolya");
  expect(p.midjourney).toContain("--ar 1:1");
  expect(p.midjourney).toContain("--tile");
  expect(p.chatgpt).toContain("1000 x 1000");
  expect(p.midjourney).toContain("1000 x 1000");
  expect(p.chatgpt).not.toContain("--tile");
});
it("does not silently tile murals and uses integer aspect parameters", () => {
  const p = providerPrompts(
    "Paint an original waterside town and preserve its reflections.",
    undefined,
    "1.5:1",
    false,
  );
  expect(p.midjourney).toContain("--ar 3:2");
  expect(p.midjourney).not.toContain("--tile");
  expect(() => aspectParameter("broken")).toThrow();
});

it("includes explicit edge wrapping, corner, color and density rules exactly once with tile", () => {
  const p = studioPrompts(initialBrief());
  for (const fragment of [
    "same vertical coordinates",
    "same horizontal coordinates",
    "all four corners",
    "opposite boundary",
    "background color",
    "motif density",
    "1000 x 1000",
  ]) {
    expect(p.midjourney).toContain(fragment);
  }
  expect(p.midjourney.match(/--tile\b/g)).toHaveLength(1);
  expect(p.midjourney).toContain("--ar 1:1");
  expect(p.midjourney).not.toContain("--repeat");
});
it("encodes half-drop and brick as full edge-matching supertiles without applying them to straight repeats", () => {
  const d = initialBrief();
  d.values.repeat = "Half-drop";
  expect(studioPrompts(d).midjourney).toContain("two-column supertile");
  d.values.repeat = "Brick";
  expect(studioPrompts(d).midjourney).toContain("two-row supertile");
  d.values.repeat = "Straight";
  expect(studioPrompts(d).midjourney).not.toContain("two-column");
});
it("separates horizontal mural wrap, ordinary mural panel cuts and isolated motifs", () => {
  const d = initialBrief();
  d.mode = "continuous";
  const continuous = studioPrompts(d).midjourney;
  expect(continuous).toContain("do not tile vertically");
  expect(continuous).toContain("left and right boundaries");
  expect(continuous).not.toContain("--tile");
  d.mode = "mural";
  expect(studioPrompts(d).midjourney).toContain("one uninterrupted master composition");
  expect(studioPrompts(d).midjourney).toContain("does not require");
  d.mode = "motif";
  expect(studioPrompts(d).midjourney).not.toContain("four-edge repeat:");
  expect(studioPrompts(d).midjourney).not.toContain("--tile");
});
it("applies the same continuity policy to analysis prompts and SKU approval snapshots", () => {
  const p = reviewProviderPrompts(
    "Correct the motif scale.",
    "text, border",
    "4:3",
    "pattern",
  );
  expect(p.midjourney).toContain("1000 x 1000");
  expect(p.midjourney).toContain("--tile");
  expect(p.midjourney).toContain("--ar 1:1");
  const mural = reviewProviderPrompts(
    "Continuous scenic mural; four-edge wording in source notes.",
    "text",
    "4:3",
    "continuous",
  );
  expect(mural.midjourney).not.toContain("--tile");
  expect(mural.midjourney).toContain("do not tile vertically");
});

it("describes the artwork directly without turning landscape subjects into a room presentation",()=>{const p=providerPrompts("A wall mural with reeds, trees and a lake. Wall target 400 × 300 cm. Hero projected height 40%.", "text", "4:3",false,{mode:"mural"});const positive=p.midjourney.split("--no")[0];expect(positive).toContain("reeds, trees and a lake");expect(positive).toContain("Hero projected height 40%");expect(positive).not.toMatch(/wall mural|wallpaper|400 × 300|adjacent panels/i);expect(p.midjourney).toContain("--raw");expect(p.midjourney).toContain("mockup");expect(p.chatgpt).toContain("Wall target 400 × 300 cm");});
