import { it, expect } from "vitest";
import { observationSchema, watchCsv } from "../src/lib/keyword-watch";
import { mergeWatchEvidence } from "../src/lib/watch-evidence";
import { rankLocalKeywords } from "../src/lib/local-listing";
const base = {
  term: "forest wallpaper",
  observedAt: "2026-01-01",
  market: "US",
  searches: "<20",
  competition: "",
  clicks: "0",
  ctr: "",
  notes: "",
};
it("preserves suppressed, missing and real zero values; rejects invalid/future dates", () => {
  expect(observationSchema.parse(base)).toMatchObject({
    searches: "<20",
    competition: "",
    clicks: "0",
  });
  for (const observedAt of ["2026-02-30", "2099-01-01"])
    expect(observationSchema.safeParse({ ...base, observedAt }).success).toBe(
      false,
    );
  expect(
    observationSchema.safeParse({ ...base, searches: "1,200,300" }).success,
  ).toBe(false);
});
it("latest US measurement wins without mixing markets or old data", () => {
  const result = mergeWatchEvidence(
    [{ term: base.term, category: "MZ", data: { aylik_arama: "999999" } }],
    [
      { ...base, searches: "100" },
      { ...base, observedAt: "2026-02-01", searches: "<20" },
      { ...base, observedAt: "2026-03-01", market: "UK", searches: "9999" },
    ],
  );
  const ranked = rankLocalKeywords(result, {
    subject: "forest",
    color: "",
    style: "",
    product: "wallpaper",
    notes: "",
    material: "",
  });
  expect(ranked[0].searches).toBeNull();
  expect(ranked[0].competition).toBeNull();
  expect(ranked[0].sourceDate).toBe("2026-02-01");
});
it("quotes CSV and blocks spreadsheet formula injection", () => {
  expect(watchCsv([{ term: '=HYPERLINK("x")', notes: "a,b" }])).toContain(
    '"\'=HYPERLINK(""x"")"',
  );
});
