import { it, expect } from "vitest";
import {
  csvSettingsSchema,
  parseResearchCsv,
  csvMetric,
  observationIdentity,
  type CsvRecord,
} from "../src/lib/csv-research";
import { analyseResearch, latestRecords } from "../src/lib/csv-research-report";
const settings = csvSettingsSchema.parse({
  market: "US",
  definition: "monthly",
  period: "2026-09",
  numberFormat: "en",
});
const parse = (csv: string, extra = {}) =>
  parseResearchCsv(csv, { ...settings, ...extra });
const record = (
  period: string,
  searches: string,
  extra: Partial<CsvRecord> = {},
): CsvRecord => ({
  row: 2,
  term: "forest mural",
  market: "US",
  platform: "Etsy",
  source: "erank-keyword",
  definition: "monthly",
  period,
  observedAt: "",
  metrics: {
    searches: csvMetric(searches, "en"),
    clicks: csvMetric("", "en"),
    competition: csvMetric("1000", "en"),
    ctr: csvMetric("120%", "en"),
  },
  ...extra,
});
it("reads BOM, Turkish headers, quoted delimiters/newlines and exact/suppressed/missing/zero metrics", () => {
  const p = parse(
    '\uFEFFkelime;aylik_arama;rakip_ilan;ctr;not\r\n"forest mural";"1,200";<20;120%;"a;b\nsecond line"\r\nfloral wallpaper;0;Unknown;;note',
  );
  expect(p.records).toHaveLength(2);
  expect(p.records[0].metrics.searches.value).toBe(1200);
  expect(p.records[0].metrics.competition.kind).toBe("below");
  expect(p.records[0].metrics.ctr.value).toBe(120);
  expect(p.records[1].metrics.competition.value).toBeNull();
  expect(p.total).toBe(2);
});
it("validates ambiguous numbers without turning <20, unknown or zero into each other", () => {
  expect(() => csvMetric("1,200", "auto")).toThrow("belirsiz");
  expect(csvMetric("1.200,5", "tr").value).toBe(1200.5);
  expect(csvMetric("12,5%", "auto").value).toBe(12.5);
  expect(csvMetric("<20", "en").kind).toBe("below");
  expect(csvMetric("0", "en").value).toBe(0);
  expect(csvMetric("Unknown", "en").value).toBeNull();
});
it("never silently loses invalid rows and accounts for duplicates", () => {
  const p = parse(
    "keyword,searches\nforest mural,100\nforest mural,100\nfloral wallpaper,bad\na,5",
  );
  expect(p.records.length + p.errors.length + p.duplicates).toBe(p.total);
  expect(p.errors).toHaveLength(2);
  expect(p.duplicates).toBe(1);
  expect(() => parse('keyword,searches\n"unclosed,4')).toThrow();
});
it("reads row-specific dates and markets; rejects future or malformed periods", () => {
  const p = parse(
    "keyword,searches,month,country\nforest mural,100,2026-08,UK\nforest mural,200,2099-01,US",
  );
  expect(p.records[0].market).toBe("UK");
  expect(p.records[0].period).toBe("2026-08");
  expect(p.errors).toHaveLength(1);
});
it("expands YYYY-MM search columns without mixing in average metrics", () => {
  const p = parse(
    "keyword,Average Searches,2026-07,2026-08,2026-09\nforest mural,999,100,120,160",
  );
  expect(p.records).toHaveLength(3);
  expect(p.records.map((r) => r.metrics.searches.value)).toEqual([
    100, 120, 160,
  ]);
  expect(
    p.records.every(
      (r) =>
        r.row === 2 &&
        r.definition === "monthly" &&
        r.metrics.competition.kind === "missing",
    ),
  ).toBe(true);
});
it("needs independent complete months for a three-month direction signal", () => {
  const report = analyseResearch([
    record("2026-07", "100"),
    record("2026-08", "120"),
    record("2026-09", "180"),
  ]);
  expect(report.changes[0]).toMatchObject({
    before: 120,
    after: 180,
    delta: 60,
    percent: 50,
    periods: 3,
  });
  expect(report.changes[0].label).toContain("kesin trend değildir");
  expect(
    analyseResearch([
      record("2026-09", "100"),
      record(new Date().toISOString().slice(0, 7), "999"),
    ]).changes,
  ).toHaveLength(0);
});
it("does not compare mixed markets, metric definitions, nonconsecutive months or suppressed values", () => {
  expect(
    analyseResearch([
      record("2026-08", "100"),
      record("2026-09", "200", { market: "UK" }),
    ]).changes,
  ).toHaveLength(0);
  expect(
    analyseResearch([
      record("2026-08", "100"),
      record("2026-09", "200", { definition: "rolling12" }),
    ]).changes,
  ).toHaveLength(0);
  expect(
    analyseResearch([record("2026-07", "100"), record("2026-09", "200")])
      .changes,
  ).toHaveLength(0);
  expect(
    analyseResearch([record("2026-08", "<20"), record("2026-09", "200")])
      .changes,
  ).toHaveLength(0);
});
it("zero baseline gets an absolute difference without fake infinity percent", () => {
  expect(
    analyseResearch([record("2026-08", "0"), record("2026-09", "18")])
      .changes[0],
  ).toMatchObject({ delta: 18, percent: null, lowBase: true });
});
it("distinguishes rolling averages, revisions and same-month year-on-year", () => {
  const a = record("2026-08", "100", { definition: "rolling12" }),
    b = record("2026-09", "160", { definition: "rolling12" });
  expect(analyseResearch([a, b]).changes[0].label).toContain("ortalama düzeyi");
  expect(latestRecords([a, { ...a, metrics: b.metrics }])).toHaveLength(1);
  expect(
    analyseResearch([
      record("2025-09", "100"),
      record("2026-09", "160"),
    ]).changes.some((c) => c.label.includes("Geçen yıl")),
  ).toBe(true);
});
it("opportunities compare one definition and period, filter claims, do not invent demand for a missing row", () => {
  const r = analyseResearch(
    [
      record("2026-09", "150"),
      record("2026-09", "99999", { term: "peel and stick wallpaper" }),
      record("2026-08", "9999", { term: "floral wallpaper" }),
      record("2026-09", "999", {
        term: "forest wallpaper",
        definition: "rolling12",
      }),
    ],
    ["forest mural"],
  );
  expect(r.opportunities.map((r) => r.term)).toEqual(["forest wallpaper"]);
  expect(r.newCandidates[0].term).toBe("forest wallpaper");
  expect(r.changes).toHaveLength(0);
});
it("fingerprint ignores row position but retains metric, period and source semantics", () => {
  const r = record("2026-09", "100");
  expect(observationIdentity(r)).toBe(observationIdentity({ ...r, row: 99 }));
  expect(observationIdentity(r)).not.toBe(
    observationIdentity({ ...r, period: "2026-08" }),
  );
});
it("does not label a single candidate as relatively high competition", () => {
  expect(analyseResearch([record("2026-09", "150")]).attention).toHaveLength(0);
});
it("compares actual click changes and dated competition snapshots separately", () => {
  const a = record("2026-08", "100", { observedAt: "2026-09-01" }),
    b = record("2026-09", "100", { observedAt: "2026-09-30" });
  a.metrics.clicks = csvMetric("120", "en");
  b.metrics.clicks = csvMetric("160", "en");
  b.metrics.competition = csvMetric("900", "en");
  const r = analyseResearch([a, b]);
  expect(r.changes.find((c) => c.metric === "clicks")).toMatchObject({
    delta: 40,
  });
  expect(r.changes.find((c) => c.metric === "competition")).toMatchObject({
    from: "2026-09-01",
    to: "2026-09-30",
    delta: -100,
  });
});
it('does not rank missing competition as zero or infer sales from keyword metrics',()=>{
 const missing=record('2026-09','99999',{term:'botanical wallpaper'});missing.metrics.competition=csvMetric('','en');
 const r=analyseResearch([missing,record('2026-09','100')]);
 expect(r.opportunities.map(v=>v.term)).toEqual(['forest mural']);
 expect(r.incompleteCandidates[0].term).toBe('botanical wallpaper');
 expect(r.incompleteCandidates[0].competition).toBeNull();
 expect(r.evidencePolicy).toMatchObject({decision:'NOT_ASSESSED_FROM_KEYWORDS',actualOrders:null,successProbability:null});
 expect(r.evidencePolicy.coverage.unknown).toBeGreaterThan(0);
 expect(r.evidencePolicy.coverage.score).toBeNull();
 expect(r.evidencePolicy.rules).toHaveLength(4);
});
it('sample size alone never creates category success or a score',()=>{
 const r=analyseResearch(Array.from({length:50},(_,i)=>record('2026-09','100',{term:`forest mural ${i}`})));
 expect(r.evidencePolicy.successProbability).toBeNull();expect(r.evidencePolicy.coverage.score).toBeNull();
});
it('creates a descriptive source report without market or period metadata',()=>{
 const rows=[record('', '1202',{term:'botanical wallpaper',sourceFile:'eRank - Keyword Tool - botanical mural.csv',market:'unknown',definition:'unknown'}),record('','785',{term:'dark botanical wallpaper',sourceFile:'eRank - Keyword Tool - dark botanical wallpaper.csv',market:'unknown',definition:'unknown'})];
 const r=analyseResearch(rows);expect(r.sourceOverview.sourceTerms.map(v=>v.term)).toEqual(['dark botanical wallpaper']);expect(r.sourceOverview.sourceTerms[0].searches.raw).toBe('785');expect(r.sourceOverview.mode).toBe('DESCRIPTIVE_WITH_UNKNOWN_METADATA');expect(r.changes).toHaveLength(0);expect(r.opportunities).toHaveLength(0);
});
it('uses a repeated main term from its preserved observation even if first seen in another file',()=>{
 const r=analyseResearch([record('', '1202',{term:'botanical wallpaper',sourceFile:'eRank - Keyword Tool - botanical mural.csv',market:'unknown',definition:'unknown'}),record('','10',{term:'botanical example',sourceFile:'eRank - Keyword Tool - botanical wallpaper.csv',market:'unknown',definition:'unknown'})]);expect(r.sourceOverview.sourceTerms[0].term).toBe('botanical wallpaper');expect(r.sourceOverview.sourceTerms[0].searches.raw).toBe('1202');
});
