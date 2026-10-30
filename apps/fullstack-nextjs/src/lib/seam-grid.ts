export type SeamGrid = {
  step: 50 | 100 | 200;
  leftRight: number[];
  topBottom: number[];
};
export const defaultSeamGrid = (): SeamGrid => ({
  step: 100,
  leftRight: [200, 500, 800],
  topBottom: [200, 500, 800],
});
export function gridLines(step: number) {
  return Array.from({ length: 1000 / step + 1 }, (_, i) => ({
    index: i,
    x: i * step,
    xId: `X${String(i).padStart(2, "0")}`,
    yId: `Y${String(i).padStart(2, "0")}`,
  }));
}
export function seamGridPlan(input?: SeamGrid) {
  const g = input || defaultSeamGrid();
  return {
    version: "seam-grid-v2",
    width: 1000,
    height: 1000,
    origin: "top-left",
    xDirection: "right",
    yDirection: "down",
    coordinateMeaning:
      "Geometric boundaries 0..1000; raster sample indices are 0..999",
    step: g.step,
    lines: gridLines(g.step),
    leftRight: [...g.leftRight]
      .sort((a, b) => a - b)
      .map((y) => ({
        id: `LR-Y${String(y / g.step).padStart(2, "0")}`,
        from: [0, y],
        to: [1000, y],
      })),
    topBottom: [...g.topBottom]
      .sort((a, b) => a - b)
      .map((x) => ({
        id: `TB-X${String(x / g.step).padStart(2, "0")}`,
        from: [x, 0],
        to: [x, 1000],
      })),
    boundaryPairs: {
      leftRight: gridLines(g.step).map((l) => ({
        from: `X00-${l.yId}`,
        to: `X${String(1000 / g.step).padStart(2, "0")}-${l.yId}`,
      })),
      topBottom: gridLines(g.step).map((l) => ({
        from: `${l.xId}-Y00`,
        to: `${l.xId}-Y${String(1000 / g.step).padStart(2, "0")}`,
      })),
    },
    corners: [
      [0, 0],
      [1000, 0],
      [0, 1000],
      [1000, 1000],
    ],
    status: "PLANNING_ONLY_NOT_PIXEL_VERIFIED",
  };
}
export function snapGrid(g: SeamGrid, step: SeamGrid["step"]): SeamGrid {
  const snap = (values: number[]) =>
    [
      ...new Set(
        values.map((v) =>
          Math.max(step, Math.min(1000 - step, Math.round(v / step) * step)),
        ),
      ),
    ].sort((a, b) => a - b);
  return { step, leftRight: snap(g.leftRight), topBottom: snap(g.topBottom) };
}
export function gridDirection(input?: SeamGrid) {
  const p = seamGridPlan(input);
  const name = (point: number[]) =>
    `X${String(point[0] / p.step).padStart(2, "0")}-Y${String(point[1] / p.step).padStart(2, "0")}`;
  const describe = (pairs: typeof p.leftRight) =>
    pairs
      .map(
        (a) =>
          `(${a.from.join(",")}) to (${a.to.join(",")}) [${name(a.from)} = ${name(a.to)}]`,
      )
      .join("; ");
  return [
    `Invisible coordinate construction plan for the 1000 x 1000 tile: origin (0,0) at top-left, x increases rightward, y downward. Grid step ${p.step}px; vertical lines X00..${p.lines.at(-1)!.xId}, horizontal lines Y00..${p.lines.at(-1)!.yId}; line index i lies at i*${p.step}px. Coordinates 0 and 1000 identify geometric boundaries, not extra pixel rows.`,
    `Boundary equality is required at EVERY grid intersection, not only selected motif crossings. For each j=0..${1000 / p.step}: X00-Yjj must match X${String(1000 / p.step).padStart(2, "0")}-Yjj. For each i=0..${1000 / p.step}: Xii-Y00 must match Xii-Y${String(1000 / p.step).padStart(2, "0")}. Substitute ii/jj with zero-padded line indices. Explicit paired nodes: ${p.boundaryPairs.leftRight.map((a) => a.from + " = " + a.to).join("; ")}. ${p.boundaryPairs.topBottom.map((a) => a.from + " = " + a.to).join("; ")}.`,
    "Matching means identical boundary appearance and continuous geometry: corresponding contour cross-section, tangent direction, line thickness, motif scale, color and texture. Continue this match along the entire boundary between grid nodes as well. Use translated wraparound copies, not mirrored motifs and not independently redrawn similar objects. The four corners must belong to the same wraparound feature. These constraints do not require the interior of the tile to be duplicated or symmetric.",
    p.leftRight.length
      ? `Planned left/right motif crossings at these paired coordinates: ${describe(p.leftRight)}.`
      : "No planned motif crossings on the left/right boundary; maintain a continuous matching background.",
    p.topBottom.length
      ? `Planned top/bottom motif crossings at these paired coordinates: ${describe(p.topBottom)}.`
      : "No planned motif crossings on the top/bottom boundary; maintain a continuous matching background.",
    "Use the selected motif and its actual shape at the planned crossings, not generic markers: continue its contour, tangent, orientation, scale, colors and stroke weight through each pair. Motifs crossing corners wrap across both axes. These are composition targets requiring inspection, not proven pixel constraints. Do not draw grid lines, coordinate labels, numbers, dots, guide marks or seam indicators in the artwork.",
  ].join(" ");
}
export function gridSvg(g: SeamGrid) {
  const p = seamGridPlan(g);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="-100 -100 1200 1200"><title>LOGESSA planning grid: inner tile 1000 by 1000 px; not artwork</title><rect x="-100" y="-100" width="1200" height="1200" fill="white"/>${p.lines.map((l) => `<path d="M${l.x} 0V1000M0 ${l.x}H1000" stroke="#afc4dc" stroke-width="1"/><text x="${l.x}" y="-30" text-anchor="middle" font-size="14">${l.xId}</text><text x="${l.x}" y="-10" text-anchor="middle" font-size="12">${l.x}</text><text x="-10" y="${l.x}" text-anchor="end" font-size="14">${l.yId}: ${l.x}</text>`).join("")}<rect width="1000" height="1000" fill="none" stroke="#244c3e" stroke-width="3"/>${[...p.leftRight, ...p.topBottom].map((a) => `<path d="M${a.from.join(" ")}L${a.to.join(" ")}" stroke="#b36c25" stroke-dasharray="8 12"/>${[a.from, a.to].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#b36c25"/>`).join("")}`).join("")}</svg>`;
}
