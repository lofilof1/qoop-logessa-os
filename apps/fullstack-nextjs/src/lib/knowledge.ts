export function normalise(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}
export function compactContext(dataset: any, query: string, familyId?: string) {
  const terms = normalise(query)
    .split(/\s+/)
    .filter((x) => x.length > 1);
  const score = (s: string) =>
    terms.reduce((n, t) => n + (normalise(s).includes(t) ? 1 : 0), 0);
  const ranked = (rows: any[], field: (r: any) => string) =>
    rows
      .map((row) => ({ row, score: score(field(row)) }))
      .filter((x) => !terms.length || x.score > 0)
      .sort((a, b) => b.score - a.score);
  const refs = dataset.references.filter(
    (r: any) => !familyId || r.familyId === familyId,
  );
  const references = ranked(refs, (r) =>
    [r.title, r.data.summary, r.data.style].join(" "),
  )
    .slice(0, 5)
    .map(({ row: r }) => ({
      id: r.id,
      title: r.title,
      familyId: r.familyId,
      summary: r.data.summary,
      style: r.data.style,
      sourceDate: r.observedAt,
      aliases: r.data.aliases,
    }));
  const keywords = ranked(
    dataset.keywords.filter((k: any) => k.focused),
    (k) => k.term,
  )
    .sort(
      (a, b) =>
        b.score - a.score ||
        (Number(b.row.data.aylik_arama) || 0) -
          (Number(a.row.data.aylik_arama) || 0),
    )
    .slice(0, 15)
    .map(({ row: k }) => ({
      term: k.term,
      searches: k.data.aylik_arama,
      competition: k.data.rakip_ilan,
    }));
  const prompts = ranked(
    dataset.prompts.filter((p: any) => !familyId || p.familyId === familyId),
    (p) => p.title + " " + p.prompt,
  )
    .slice(0, 3)
    .map(({ row: p }) => ({ code: p.code, title: p.title, used: p.used }));
  return {
    snapshotDate: dataset.manifest.snapshotDate,
    sourceHash: dataset.manifest.datasetHash,
    query,
    familyId,
    references,
    keywords,
    existingPrompts: prompts,
    limits: { references: 5, keywords: 15, prompts: 3 },
    note: "Historical research, not confirmed sales or approved LOGESSA aesthetic. No pixel review performed.",
  };
}
