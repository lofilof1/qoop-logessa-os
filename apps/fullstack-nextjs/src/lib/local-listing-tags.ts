import {englishCopyIssues} from "./listing-language";
import type { ListingVisual, VisionCandidate } from "./listing-vision";
const legal = /^[a-z0-9][a-z0-9 '\-]*$/;
const turkish = /\b(duvar|kagidi|kagit|yesil|mavi|pembe|siyah|beyaz|cicek|desen|manzara|yatak|odasi|salon|renk|altin|yaprak|orman|gol|sulu|boya|koyu|arka|plan|yapay|sanat|tropikal|turuncu|mutfak|banyo|ofis|kirmizi|motif|sari|mor|bej|kahverengi|suluboya|geometrik|yogun)\b/;
export function englishVisualPhrase(value:string) {
 const map:Record<string,string>={'ve':'and','hibiskus':'hibiscus','cicekler':'flowers','yapraklari':'leaves','cicekleri':'flowers','motif':'pattern','koyu mavi':'deep blue','koyu yesil':'dark green','arka plan':'background','hibiskus cicekleri':'hibiscus flowers','monstera yapraklari':'monstera leaves','palm yapraklari':'palm leaves','yatak odasi':'bedroom','oturma odasi':'living room','sulu boya':'watercolor','kirmizi':'red','turuncu':'orange','yesil':'green','mavi':'blue','pembe':'pink','siyah':'black','beyaz':'white','altin':'gold','bej':'beige','kahverengi':'brown','sari':'yellow','mor':'purple','tropikal':'tropical','cicek':'floral','yaprak':'leaf','mutfak':'kitchen','banyo':'bathroom','ofis':'office','salon':'living room','suluboya':'watercolor','geometrik':'geometric','yogun':'dense'};
 let s=value.toLowerCase().replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 for(const [tr,en] of Object.entries(map)) s=s.replace(new RegExp('\\b'+tr+'\\b','g'),en);
 return s.replace(/\bstyle style\b/g,'style');
}
const unverified =
  /\b(seamless|tileable|waterproof|removable|peel|stick|vinyl|digital|download|toxic|certified|licensed|shipping|free|print|panels)\b/;
export function localTagPool(
  visual: ListingVisual,
  candidates: VisionCandidate[],
) {
  visual={...visual,subject:englishVisualPhrase(visual.subject),motifs:visual.motifs.map(englishVisualPhrase),colors:visual.colors.map(englishVisualPhrase),styles:visual.styles.map(englishVisualPhrase),rooms:visual.rooms.map(englishVisualPhrase),searchTerms:visual.searchTerms.map(englishVisualPhrase)};
  const stem = (w: string) => w.length > 3 && w.endsWith("s") ? w.slice(0,-1) : w;
  const observed = new Set([visual.subject, ...visual.motifs, ...visual.colors, ...visual.styles, ...visual.rooms, ...visual.searchTerms].join(" ").toLowerCase().split(/[^a-z0-9]+/).map(stem));
  const context = new Set(["wallpaper", "wall", "mural", "art", "decor", "design", "pattern", "and", "style", "tones"]);
  const compatible = (phrase: string) => !/gold leaf|textured wall|wall panels/.test(phrase) && phrase.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every(w => context.has(w) || observed.has(stem(w)));
  const phrases = [
    ...candidates.map((c) => c.term).filter(compatible),
    ...visual.searchTerms,
    ...visual.colors.map((c) => c + " tones"),
    ...visual.motifs.map((m) => m + " pattern"),
    ...visual.styles.map((c) => c + " style"),
    ...visual.colors.flatMap((c, i) => visual.colors.slice(i + 1).map(d => c + " and " + d)),
    ...visual.styles.map((c) => c + " wallpaper"),
    ...visual.rooms.map((r) => r + " accent"),
    ...visual.rooms.map((r) => r + " decor"),
    ...(visual.product === "wall mural"
      ? ["scenic wall mural", "wall mural design", "mural wall decor"]
      : []),
    "interior accent",
    "statement wall",
    "decorative pattern",
    "feature wall",
    "wallpaper design",
    "decorative wallpaper",
    "feature wall design",
    "accent wall decor",
    "interior wallpaper",
    "wall covering",
    "home wall decor",
    "wall decor design",
    "wallpaper decor",
    "interior wall decor",
    "pattern wall decor",
    "artistic wallpaper",
    "statement wallpaper",
  ];
  return [
    ...new Set(
      phrases
        .map((s) => s.toLowerCase().trim().replace(/\s+/g, " ").replace(/\bstyle style\b/g,"style"))
        .filter(
          (s) =>
            s.split(/\s+/).length >= 2 &&
            s.length >= 2 &&
            s.length <= 20 &&
            legal.test(s) && englishCopyIssues(s).length === 0 &&
            !unverified.test(s) && !turkish.test(s) && !/\b(cicek|yaprak|yesil|kirmizi|turuncu|kagit|duvar|yapay|sanat)[a-z]*\b/.test(s),
        ),
    ),
  ];
}
export function chooseLocalTags(proposed: string[], pool: string[]) {
  const allowed = new Set(pool);
  const remaining = [...new Set([...proposed.map(s => s.toLowerCase().trim()).filter(s => allowed.has(s)), ...pool])];
  const result: string[] = [];
  const counts = new Map<string, number>();
  const signatures = new Set<string>();
  const words = (tag: string) => tag.split(/[ '-]+/).filter(Boolean).map(w => w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  while (result.length < 13) {
    const eligible = remaining.filter(tag => {
      const ws = words(tag);
      return !result.includes(tag) && !signatures.has([...ws].sort().join(" ")) &&
        !(ws.includes("wallpaper") && counts.has("wallpaper"));
    });
    const score = (tag: string) => {
      const ws = words(tag);
      return ws.reduce((n,w) => n + (counts.has(w) ? -2 * counts.get(w)! : 3), 0) / Math.sqrt(ws.length) + (proposed.includes(tag) ? 0.5 : 0);
    };
    eligible.sort((a,b) => score(b) - score(a) || remaining.indexOf(a) - remaining.indexOf(b));
    if (!eligible.length) break;
    const tag = eligible[0];
    result.push(tag);
    const ws = words(tag);
    signatures.add([...ws].sort().join(" "));
    for (const w of new Set(ws)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  if (result.length !== 13)
    throw Error(
      "Görsele uygun 13 geçerli etiket belirlenemedi; Claude’a geçilmedi.",
    );
  return result;
}
