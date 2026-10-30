import type { KeywordEvidence } from "./listing";
type Observation = {
  term: string;
  observedAt: string;
  market: string;
  searches: string;
  competition: string;
};
export function mergeWatchEvidence(
  rows: KeywordEvidence[],
  observations: Observation[],
) {
  const map = new Map(rows.map((r) => [r.term, r]));
  for (const o of observations) {
    // Only a single comparable market enters the ranking. Other markets stay in history.
    if (o.market !== "US") continue;
    const previous = map.get(o.term);
    const old = previous?.data as Record<string, unknown> | undefined;
    if (old?.source === "manual-watch" && String(old.observedAt) > o.observedAt)
      continue;
    map.set(o.term, {
      term: o.term,
      category: previous?.category || "manual",
      data: {
        source: "manual-watch",
        observedAt: o.observedAt,
        market: o.market,
        aylik_arama: o.searches,
        rakip_ilan: o.competition,
      },
    });
  }
  return [...map.values()];
}
