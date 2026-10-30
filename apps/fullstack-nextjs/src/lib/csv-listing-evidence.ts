import { db } from "./db";
import type { KeywordEvidence } from "./listing";
import type { CsvRecord } from "./csv-research";
export async function csvListingEvidence(rows: KeywordEvidence[]) {
  // Use only comparable US Etsy eRank 12-month averages, never monthly and average values in the same ranking.
  const observations = await db.keywordCsvObservation.findMany({
    where: {
      market: "US",
      platform: "Etsy",
      source: "erank-keyword",
      definition: "rolling12",
      period: { not: "" },
    },
    orderBy: [{ period: "asc" }, { observedAt: "asc" }, { createdAt: "asc" }],
  });
  const map = new Map(rows.map((r) => [r.term, r]));
  for (const o of observations) {
    const metrics = o.metrics as unknown as CsvRecord["metrics"];
    const prior = map.get(o.term);
    const old = (prior?.data || {}) as Record<string, unknown>;
    const sourceDate = o.observedAt || o.period;
    if (old.source === "manual-watch" && String(old.observedAt) > sourceDate)
      continue;
    const show = (k: "searches" | "competition") =>
      metrics[k].kind === "exact" ? String(metrics[k].value) : metrics[k].raw;
    map.set(o.term, {
      term: o.term,
      category: prior?.category || "csv",
      data: {
        source: "csv-erank",
        observedAt: `${o.period} bitişli 12 ay ortalaması; kontrol ${o.observedAt || "belirtilmedi"}`,
        aylik_arama: show("searches"),
        rakip_ilan: show("competition"),
      },
    });
  }
  // Unknown metadata may supply vocabulary only, never numerical ranking or a trend.
  const unverified=await db.keywordCsvObservation.findMany({where:{source:"erank-keyword",platform:"Etsy",OR:[{market:"unknown"},{definition:"unknown"},{period:""}]},orderBy:{createdAt:"asc"}});
  for(const o of unverified)if(!map.has(o.term))map.set(o.term,{term:o.term,category:"csv-unverified",data:{source:"csv-unverified",observedAt:"CSV: ülke/ölçüm dönemi doğrulanmadı; yalnız kelime eşleşmesi",metricsVerified:false}});
  return [...map.values()];
}
