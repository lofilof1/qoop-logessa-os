import {researchRules,researchPolicyVersion,evidenceCoverage} from "./research-policy";
import {
  researchToday,
  comparableKey,
  periodIndex,
  type CsvRecord,
  type Metric,
  metricKeys,
} from "./csv-research";
export const reportVersion = "csv-research-v4-source-overview";
const currentMonth = () => researchToday().slice(0, 7);
export function latestRecords(rows: CsvRecord[]) {
  const map = new Map<string, CsvRecord>();
  for (const r of rows) {
    const key = [comparableKey(r), r.period, r.observedAt].join("|");
    map.set(key, r);
  }
  return [...map.values()];
}
function exact(m: Metric) {
  return m.kind === "exact" ? m.value : null;
}
export function difference(a: Metric, b: Metric) {
  const old = exact(a),
    now = exact(b);
  if (old === null || now === null) return null;
  const delta = now - old;
  return {
    before: old,
    after: now,
    delta,
    percent: old === 0 ? null : Math.round((delta / old) * 1000) / 10,
    lowBase: old < 20,
  };
}
const relevance = /wallpaper|mural|duvar/i;
const restricted =
  /\b(peel|stick|removable|washable|vinyl|digital|download|free|sample|toxic|licensed)\b/i;
export function analyseResearch(
  rows: CsvRecord[],
  watchTerms: string[] = [],
  filters: { market?: string; query?: string } = {},
) {
  const all = latestRecords(rows);
  const selected = all.filter(
    (r) =>
      (!filters.market || r.market === filters.market) &&
      (!filters.query || r.term.includes(filters.query.toLowerCase())),
  );
  const groups = new Map<string, CsvRecord[]>();
  for (const r of selected) {
    const key = comparableKey(r);
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  const changes: {
    term: string;
    market: string;
    label: string;
    from: string;
    to: string;
    delta: number;
    percent: number | null;
    lowBase: boolean;
    before: number;
    after: number;
    direction: string;
    periods: number;
    sourceFile?: string;
    batchId?: string;
    source: string;
    definition: string;
    observedAt: string;
    row: number;
    metric: string;
  }[] = [];
  const opportunities: {
    term: string;
    market: string;
    searches: number | null;
    competition: number | null;
    period: string;
    definition: string;
    reason: string;
    newCandidate: boolean;
    tagEligible: boolean;
    sourceFile?: string;
    batchId?: string;
    source: string;
    row: number;
  }[] = [];
  const warnings: string[] = [];
  let unknown = 0,
    suppressed = 0,
    stale = 0;
  for (const r of selected) {
    if (r.definition === "unknown" || !r.period || r.market === "unknown")
      unknown++;
    for (const k of metricKeys) if (r.metrics[k].kind === "below") suppressed++;
    if (r.period && periodIndex(currentMonth()) - periodIndex(r.period) > 3)
      stale++;
  }
  for (const group of groups.values()) {
    const monthly = new Map<string, CsvRecord>();
    for (const r of group) if (r.period) monthly.set(r.period, r);
    const series = [...monthly.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );
    const def = group[0].definition;
    const usable = series.filter(
      (r) => def !== "monthly" || r.period < currentMonth(),
    );
    const latest = usable.at(-1) || series.at(-1) || group.at(-1)!;
    if (
      latest.platform === "Etsy" &&
      latest.source === "erank-keyword" &&
      latest.market !== "unknown"
    ) {
      const searches = exact(latest.metrics.searches),
        competition = exact(latest.metrics.competition);
      if (
        relevance.test(latest.term) &&
        !restricted.test(latest.term) &&
        searches !== null &&
        searches > 0
      )
        opportunities.push({
          term: latest.term,
          market: latest.market,
          searches,
          competition,
          period: latest.period || "Dönem bilinmiyor",
          definition: def,
          reason:
            "Ürün türüyle kelime eşleşmesi var; motif, renk ve malzeme uyumunu listing tarifinde ayrıca kontrol et.",
          newCandidate: !watchTerms.includes(latest.term),
          tagEligible: latest.term.length <= 20,
          sourceFile: latest.sourceFile,
          batchId: latest.batchId,
          source: latest.source,
          row: latest.row,
        });
    }
    if (
      latest.market === "unknown" ||
      latest.platform !== "Etsy" ||
      latest.source !== "erank-keyword" ||
      def === "unknown"
    )
      continue;
    const prev = usable.at(-2),
      last = usable.at(-1);
    if (prev && last) {
      // Same period revisions are not a new month; only independent monthly values form a monthly signal.
      for (const metric of ["searches", "clicks", "ctr"] as const) {
        const diff = difference(prev.metrics[metric], last.metrics[metric]);
        if (
          diff &&
          diff.delta !== 0 &&
          (def !== "monthly" ||
            periodIndex(last.period) - periodIndex(prev.period) === 1)
        ) {
          const third = usable.at(-3);
          let consistent = false;
          if (
            def === "monthly" &&
            third &&
            periodIndex(prev.period) - periodIndex(third.period) === 1
          ) {
            const first = difference(
              third.metrics[metric],
              prev.metrics[metric],
            );
            consistent =
              !!first &&
              first.delta !== 0 &&
              Math.sign(first.delta) === Math.sign(diff.delta);
          }
          changes.push({
            term: last.term,
            market: last.market,
            label:
              (metric === "clicks"
                ? "Tıklama: "
                : metric === "ctr"
                  ? "CTR (yüzde puanı farkı): "
                  : "Arama: ") +
              (def === "rolling12"
                ? "12 aylık ortalama düzeyi değişimi"
                : consistent
                  ? "3 tam ayda yön sinyali — kesin trend değildir"
                  : "İki tam ay arasında değişim"),
            from: prev.period,
            to: last.period,
            ...diff,
            direction: diff.delta > 0 ? "up" : diff.delta < 0 ? "down" : "flat",
            periods: consistent ? 3 : 2,
            sourceFile: last.sourceFile,
            batchId: last.batchId,
            source: last.source,
            definition: def,
            observedAt: last.observedAt,
            row: last.row,
            metric,
          });
        }
      }
      if (def === "monthly") {
        const prior = usable.find(
          (r) => periodIndex(r.period) === periodIndex(last.period) - 12,
        );
        if (prior) {
          const yoy = difference(prior.metrics.searches, last.metrics.searches);
          if (yoy)
            changes.push({
              term: last.term,
              market: last.market,
              label:
                "Geçen yılın aynı ayına göre — mevsimsellik kanıtı değildir",
              from: prior.period,
              to: last.period,
              ...yoy,
              direction: yoy.delta > 0 ? "up" : yoy.delta < 0 ? "down" : "flat",
              periods: 2,
              sourceFile: last.sourceFile,
              batchId: last.batchId,
              source: last.source,
              definition: def,
              observedAt: last.observedAt,
              row: last.row,
              metric: "searches",
            });
        }
      }
    }
    // Competition is a snapshot, compared by actual capture dates rather than the search-average period.
    const captures = new Map<string, CsvRecord>();
    for (const r of group) if (r.observedAt) captures.set(r.observedAt, r);
    const snaps = [...captures.values()].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );
    const b = snaps.at(-1),
      a = snaps.at(-2);
    if (a && b) {
      const d = difference(a.metrics.competition, b.metrics.competition);
      if (d && d.delta !== 0)
        changes.push({
          term: b.term,
          market: b.market,
          label: "Rakip ilan sayısı değişimi — talep değişimi değildir",
          from: a.observedAt,
          to: b.observedAt,
          ...d,
          direction: d.delta > 0 ? "up" : d.delta < 0 ? "down" : "flat",
          periods: 2,
          sourceFile: b.sourceFile,
          batchId: b.batchId,
          source: b.source,
          definition: def,
          observedAt: b.observedAt,
          row: b.row,
          metric: "competition",
        });
    }
  }
  if (unknown)
    warnings.push(
      `${unknown} gözlemde ülke veya ölçüm dönemi/tanımı belirsiz; trend hesabına alınmadı.`,
    );
  if (suppressed)
    warnings.push(
      `${suppressed} metrik < sınırıyla verilmiş; kesin sayı veya yüzde üretilmedi.`,
    );
  if (stale)
    warnings.push(
      `${stale} gözlem 3 aydan eski; kaynak dönemiyle gösteriliyor.`,
    );
  if (!changes.length)
    warnings.push(
      "Karşılaştırılabilir yeterli veri yok. Tek ölçümden yükselen/düşen trend sonucu çıkarılmaz.",
    );
  warnings.push(
    "CTR satış dönüşümü değildir; %100 üzerinde olabilir. eRank tahminleri mağazanın gerçek satış verisi değildir.",
  );
  warnings.push(...researchRules);
  const score = (r: (typeof opportunities)[number]) =>
    Math.log1p(r.searches || 0) -
    (r.competition === null ? 0 : Math.log1p(r.competition) * 0.25);
  // Rank only one comparable metric cohort, never a monthly value against a rolling average.
  const cohortDefinition = opportunities.some(
    (r) => r.definition === "rolling12",
  )
    ? "rolling12"
    : "monthly";
  const cohortPeriod = opportunities
    .filter(
      (r) =>
        r.definition === cohortDefinition && /^\d{4}-\d{2}$/.test(r.period),
    )
    .map((r) => r.period)
    .sort()
    .at(-1);
  const comparableOpportunities = opportunities.filter(
    (r) => r.definition === cohortDefinition && r.period === cohortPeriod && r.competition !== null,
  );
  comparableOpportunities.sort(
    (a, b) => score(b) - score(a) || a.term.localeCompare(b.term),
  );
  const seen = new Set<string>();
  const ranked = comparableOpportunities.filter((r) => {
    const key = r.term + "|" + r.market;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const comparableCompetitions = comparableOpportunities
    .filter((r) => r.competition !== null)
    .map((r) => r.competition!)
    .sort((a, b) => a - b);
  const pressureLimit =
    comparableCompetitions[Math.floor(comparableCompetitions.length * 0.75)];
  const medianSearch = [...comparableOpportunities]
    .map((r) => r.searches || 0)
    .sort((a, b) => a - b)[Math.floor(comparableOpportunities.length * 0.5)];
  const pressure = comparableOpportunities
    .filter(
      (r) =>
        comparableOpportunities.length >= 4 &&
        r.competition !== null &&
        r.competition > 0 &&
        r.competition >= pressureLimit &&
        (r.searches || 0) <= medianSearch,
    )
    .slice(0, 5)
    .map((r) => ({
      term: r.term,
      reason:
        "Aynı dönem grubunda görece yüksek rekabet / düşük talep. Daha özel ve tasarımla uyumlu arama ifadeleri araştır; satış başarısızlığı kanıtı değildir.",
    }));
  const sourceQueries = [...new Set(selected.flatMap(r => {
    const query = /^eRank - Keyword Tool - (.+)\.csv$/i.exec(r.sourceFile || "")?.[1];
    return query && !/ - Top Listings$/i.test(query) ? [query] : [];
  }))];
  const sourceTerms = sourceQueries.flatMap(query => {
    const r = selected.find(row => row.term === query.toLowerCase());
    return r ? [{term:r.term, searches:r.metrics.searches, clicks:r.metrics.clicks, ctr:r.metrics.ctr, competition:r.metrics.competition, sourceFile:r.sourceFile, row:r.row}] : [];
  });
  return {
    sourceOverview: {sourceTerms, mode:unknown ? "DESCRIPTIVE_WITH_UNKNOWN_METADATA" : "DESCRIPTIVE", notice:"Kaynakta bildirilen değerlerdir; başarı veya fırsat sıralaması değildir. Ülke/dönem eksikliği kaynak özetini engellemez; trend için karşılaştırılabilir dönemler gerekir."},
    version: reportVersion,
    evidencePolicy:{version:researchPolicyVersion,rules:researchRules,coverage:evidenceCoverage(selected.flatMap(r=>metricKeys.map(k=>exact(r.metrics[k])))),decision:"NOT_ASSESSED_FROM_KEYWORDS",actualOrders:null,successProbability:null},
    metadataPending:selected.filter(r=>r.market==="unknown"||r.definition==="unknown"||!r.period).slice(0,10).map(r=>({term:r.term,sourceFile:r.sourceFile,source:r.source,row:r.row,searches:r.metrics.searches.raw,competition:r.metrics.competition.raw})),
    incompleteCandidates:opportunities.filter(r=>r.competition===null).slice(0,5),
    total: selected.length,
    terms: new Set(selected.map((r) => r.term)).size,
    unknown,
    suppressed,
    stale,
    opportunities: ranked.slice(0, 5),
    newCandidates: ranked.filter((r) => r.newCandidate).slice(0, 5),
    changes: changes
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 30),
    warnings,
    attention: [
      ...pressure,
      ...selected
        .filter((r) => restricted.test(r.term) || !relevance.test(r.term))
        .slice(0, 8)
        .map((r) => ({
          term: r.term,
          reason: restricted.test(r.term)
            ? "Doğrulanmış ürün özelliği gerektirir; otomatik etiket önerilmez."
            : "Duvar kâğıdı/mural ürün ifadesi yok; tasarımla uygunluğu kontrol edilmeli.",
        })),
    ],
    cohort: cohortPeriod
      ? `${cohortDefinition} / ${cohortPeriod}`
      : "Karşılaştırılabilir fırsat grubu yok",
    method:
      "Yerel kelime araştırma sıralaması: yalnız arama ve rekabeti sayısal olarak bilinen aynı dönem kayıtları. Eksik metrikler puanlanmaz; ayrı gösterilir. Tasarım uyumu veya satış başarısı onayı değildir; listing motoru ayrıca motif/renk/tarz uyumunu arar.",
  };
}
export type ResearchReport = ReturnType<typeof analyseResearch>;
