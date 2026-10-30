import { db } from "./db";
import type { KeywordEvidence } from "./listing";
import type { CsvRecord } from "./csv-research";
export async function listingResearchRows(
  targetMarket = "US",
): Promise<KeywordEvidence[]> {
  const legacy = await db.researchKeyword.findMany({
    orderBy: { term: "asc" },
  });
  const map = new Map<string, KeywordEvidence>();
  for (const r of legacy) {
    const d = (r.data || {}) as Record<string, unknown>;
    map.set(r.term, {
      ...r,
      data: {
        ...d,
        columns: undefined,
        aylik_arama: undefined,
        rakip_ilan: undefined,
        reportedSearches: d.aylik_arama || "unknown",
        reportedCompetition: d.rakip_ilan || "unknown",
        observedAt:
          "Eski arşiv snapshot 2026-10-16; ölçüm dönemi/ülke doğrulanmadı",
        sourceFile: d.kelime_dosyalari || "Yerel araştırma arşivi",
        metricsVerified: false,
      },
    });
  }
  const observations = await db.keywordCsvObservation.findMany({
    where: { platform: "Etsy", source: "erank-keyword" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { batch: { select: { file: { select: { name: true } } } } },
  });
  for (const r of observations) {
    const m = r.metrics as unknown as CsvRecord["metrics"];
    const verified =
      targetMarket !== "unknown" &&
      r.market === targetMarket &&
      r.definition === "rolling12" &&
      !!r.period &&
      !!r.observedAt &&
      m.searches.kind === "exact" &&
      m.competition.kind === "exact" &&
      (m.competition.value ?? 0) > 0;
    const prior = map.get(r.term);
    const pd = (prior?.data || {}) as Record<string, unknown>;
    if (pd.metricsVerified === true && !verified) continue;
    map.set(r.term, {
      term: r.term,
      category: prior?.category || "csv",
      data: {
        aylik_arama:
          verified && m.searches.kind === "exact"
            ? String(m.searches.value)
            : undefined,
        rakip_ilan:
          verified && m.competition.kind === "exact"
            ? String(m.competition.value)
            : undefined,
        reportedSearches: m.searches.raw || "unknown",
        reportedCompetition: m.competition.raw || "unknown",
        observedAt: `${r.observedAt || "Çekim tarihi bilinmiyor"}; ${r.period || "dönem bilinmiyor"}; ${r.definition}`,
        sourceFile: r.batch.file.name,
        sourceRow: r.row,
        market: r.market,
        definition: r.definition,
        metricsVerified: verified,
        ...(verified ? { period: r.period } : {}),
      },
    });
  }
  return [...map.values()];
}
