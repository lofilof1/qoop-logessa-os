import { it, expect } from "vitest";
import {
  seamGridPlan,
  defaultSeamGrid,
  snapGrid,
  gridSvg,
} from "../src/lib/seam-grid";
import { initialBrief, briefSchema, structuredBrief } from "../src/lib/studio";
import {
  reviewProviderPrompts,
  studioPrompts,
} from "../src/lib/provider-prompts";
it("names every line including both geometric boundaries and pairs equal opposite coordinates", () => {
  const p = seamGridPlan();
  expect(p.lines).toHaveLength(11);
  expect(p.lines[0]).toMatchObject({ xId: "X00", yId: "Y00", x: 0 });
  expect(p.lines[10]).toMatchObject({ xId: "X10", yId: "Y10", x: 1000 });
  for (const pair of p.leftRight) {
    expect(pair.from[1]).toBe(pair.to[1]);
    expect([pair.from[0], pair.to[0]]).toEqual([0, 1000]);
  }
  for (const pair of p.topBottom) expect(pair.from[0]).toBe(pair.to[0]);
});
it("changes paired coordinates in both prompts without altering other modes", () => {
  const d = initialBrief();
  d.seamGrid = { step: 100, leftRight: [300, 700], topBottom: [400] };
  for (const prompt of Object.values(studioPrompts(d))) {
    expect(prompt).toContain("(0,300) to (1000,300)");
    expect(prompt).toContain("(400,0) to (400,1000)");
    expect(prompt).not.toContain("(0,200) to (1000,200)");
    expect(prompt).toContain("Do not draw grid lines");
  }
  expect(structuredBrief(d).seamGrid?.step).toBe(100);
  d.mode = "mural";
  expect(studioPrompts(d).midjourney).not.toContain("Invisible coordinate");
});
it("snaps every portal to the selected resolution, rejects off-grid and duplicate positions", () => {
  for (const step of [50, 100, 200] as const) {
    const g = snapGrid(defaultSeamGrid(), step);
    expect(g.leftRight.every((x) => x % step === 0 && x > 0 && x < 1000)).toBe(
      true,
    );
    expect(seamGridPlan(g).lines).toHaveLength(1000 / step + 1);
  }
  const d = initialBrief();
  expect(
    briefSchema.safeParse({
      ...d,
      seamGrid: { step: 100, leftRight: [250], topBottom: [] },
    }).success,
  ).toBe(false);
  expect(
    briefSchema.safeParse({
      ...d,
      seamGrid: { step: 100, leftRight: [200, 200], topBottom: [] },
    }).success,
  ).toBe(false);
});
it("supports quiet matching background at unselected edges and exports an editable planning SVG", () => {
  const g = { step: 100 as const, leftRight: [], topBottom: [] };
  const d = { ...initialBrief(), seamGrid: g };
  expect(studioPrompts(d).midjourney).toContain(
    "No planned motif crossings on the left/right",
  );
  const svg = gridSvg(defaultSeamGrid());
  expect(svg).toContain("X10");
  expect(svg).toContain("Y10");
  expect(svg).toContain('width="1000" height="1000"');
});

it("analysis prompts use the same default grid and studio prompts never duplicate it", () => {
  const p = reviewProviderPrompts(
    "Correct this pattern.",
    "text",
    "1:1",
    "pattern",
  );
  expect(p.midjourney).toContain("(0,200) to (1000,200)");
  expect(
    studioPrompts(initialBrief()).midjourney.match(
      /Invisible coordinate construction plan/g,
    ),
  ).toHaveLength(1);
});

it("enforces named equality at every boundary line, including non-portal nodes and corners", () => {
  const p = seamGridPlan();
  expect(p.boundaryPairs.leftRight).toHaveLength(11);
  expect(p.boundaryPairs.topBottom).toHaveLength(11);
  for (const text of Object.values(studioPrompts(initialBrief()))) {
    expect(text).toContain("X00-Y02 = X10-Y02");
    expect(text).toContain("X02-Y00 = X02-Y10");
    expect(text).toContain("X00-Y03 = X10-Y03");
    expect(text).toContain("along the entire boundary between grid nodes");
    expect(text).toContain("not mirrored motifs");
  }
});
