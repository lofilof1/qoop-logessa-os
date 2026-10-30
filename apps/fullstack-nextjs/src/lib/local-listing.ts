import { listingResultSchema, type KeywordEvidence } from "./listing";
import { normalise } from "./knowledge";
export const localListingVersion = "local-listing-v3-evidence";
export type LocalListingInput = {
  subject: string;
  color: string;
  style: string;
  product: "wallpaper" | "wall mural";
  notes: string;
  material: string;
};
const dictionary: Record<string, string> = {
  yeşil: "green",
  altın: "gold",
  "yeşil altın": "green and gold",
  "yeşil ve altın": "green and gold",
  mavi: "blue",
  turkuaz: "teal",
  krem: "cream",
  bej: "beige",
  pembe: "pink",
  adaçayı: "sage green",
  botanik: "botanical",
  çiçek: "floral",
  çiçekler: "floral",
  yaprak: "leaf",
  ağaç: "tree",
  orman: "forest",
  kuş: "bird",
  manzara: "landscape",
  "kemerli evler": "arched village",
  "yeşil evler": "green village",
  suluboya: "watercolor",
  guaj: "gouache",
  yağlıboya: "oil painting",
  vintage: "vintage",
  minimal: "minimal",
  geometrik: "geometric",
  soyut: "abstract",
};
export function listingEnglish(value: string) {
  return value
    .trim()
    .split(/[,;]/)
    .map((v) => dictionary[v.trim().toLocaleLowerCase("tr")] || v.trim())
    .filter(Boolean)
    .join(", ");
}
const generic = new Set(
  "a an and the for with of in wallpaper mural wall art decor decoration decorative design interior room pattern print painted painting style illustration scenic background feature accent scene color colour colorful artwork home contemporary modern on to".split(
    " ",
  ),
);
const restricted =
  /\b(peel|stick|removable|washable|waterproof|toxic|vinyl|pvc|prepasted|fabric|shipping|delivery|free|sample|custom|cheap|clearance|discount|digital|download|adhesive|licensed|certified|metallic)\b/i;
const words = (s: string) =>
  normalise(s)
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length > 1);
function metric(v: unknown) {
  const s = String(v ?? "").trim();
  if (!/^\d[\d,.\s]*$/.test(s)) return null;
  const n = Number(
    s
      .replace(/,(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".")
      .replace(/\s/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}
export function rankLocalKeywords(
  rows: KeywordEvidence[],
  input: LocalListingInput,
) {
  const query = [
    listingEnglish(input.subject),
    listingEnglish(input.color),
    listingEnglish(input.style),
  ].join(" ");
  const allowed = new Set(words(query));
  const subjectTokens = new Set(words(listingEnglish(input.subject)));
  const aliases: Record<string, string[]> = {
    floral: ["flower", "flowers"],
    flower: ["floral", "flowers"],
    tree: ["trees", "forest"],
    forest: ["tree", "trees"],
    bird: ["birds"],
    leaf: ["leaves", "botanical"],
    architecture: ["architectural", "buildings"],
    village: ["town", "architecture", "architectural", "buildings", "arched"],
    green: ["emerald"],
    watercolor: ["watercolour"],
  };
  for (const t of [...allowed])
    for (const a of aliases[t] || []) allowed.add(a);
  return rows
    .flatMap((r) => {
      const term = r.term.trim().toLowerCase();
      if (term.length > 80 || restricted.test(term) || /\d/.test(term))
        return [];
      const tokens = words(term);
      const specific = tokens.filter((t) => !generic.has(t));
      if (!specific.length || specific.some((t) => !allowed.has(t))) return [];
      if (input.product === "wallpaper" && tokens.includes("mural")) return [];
      const overlap = specific.filter((t) => allowed.has(t)).length;
      const d = (r.data || {}) as Record<string, unknown>;
      const c = (d.columns || {}) as Record<string, unknown>;
      const searches = metric(
        d.aylik_arama ??
          c["average searches"] ??
          c["avg. searches"] ??
          c["searches"],
      );
      const competition = metric(d.rakip_ilan ?? c.competition);
      const score =
        overlap * 100 +
        specific.filter((t) => subjectTokens.has(t)).length * 200 +
        (tokens.includes("wallpaper") || tokens.includes("mural") ? 25 : 0) +
        (searches === null || competition === null ? 0 : Math.log1p(searches) - Math.log1p(competition) * 0.1);
      return [
        {
          term,
          score,
          searches,
          competition,
          sourceDate: String(
            d.observedAt ||
              (d.source === "manual-erank"
                ? `Tarih belirtilmedi; yükleme ${d.importedAt}`
                : "2026-10-16"),
          ),
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));
}
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export function buildLocalListing(
  input: LocalListingInput,
  rows: KeywordEvidence[],
) {
  const subject = listingEnglish(input.subject),
    color = listingEnglish(input.color),
    style = listingEnglish(input.style);
  if (!subject) throw Error("Ana motif veya sahneyi belirt.");
  const ranked = rankLocalKeywords(rows, input);
  const tags: string[] = [];
  const signatures = new Set<string>();
  const add = (s: string) => {
    s = s.trim().toLowerCase().replace(/\s+/g, " ");
    const signature = words(s)
      .filter((t) => !["and", "the", "for", "with"].includes(t))
      .sort()
      .join(" ");
    if (s.length >= 2 && s.length <= 20 && !signatures.has(signature)) {
      tags.push(s);
      signatures.add(signature);
    }
  };
  add(`${subject} ${input.product === "wall mural" ? "mural" : "wallpaper"}`);
  add(`${subject} art`);
  add(`${subject} decor`);
  let evidenceTags = 0;
  for (const k of ranked) {
    const before = tags.length;
    add(k.term);
    if (tags.length > before) evidenceTags++;
    if (evidenceTags >= 7) break;
  }
  const type = input.product;
  const attributes = [subject, color, style].flatMap((x) =>
    x
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter(Boolean),
  );
  for (const a of attributes) {
    add(`${a} ${type}`);
    add(`${a} wall art`);
    add(`${a} decor`);
    add(a);
  }
  for (const s of [
    type,
    "wallpaper design",
    "decorative wallpaper",
    "wall decoration",
    "wall decor",
    "interior decor",
    "home wall decor",
    "wall artwork",
    "feature wall design",
    "accent wall decor",
    "decorative wall art",
    "interior wall art",
    "wall design",
    "wall covering",
  ])
    add(s);
  const chosen = tags.slice(0, 13);
  const evidence = ranked.filter((r) => chosen.includes(r.term)).slice(0, 13);
  const fullTitle = titleCase(
    [color, subject, style, type]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " "),
  );
  const title =
    fullTitle.length > 140
      ? fullTitle.slice(0, 140).replace(/\s+\S*$/, "")
      : fullTitle;
  const description = [
    `This ${type} design features ${subject.toLowerCase()}.`,
    color ? `The palette combines ${color.toLowerCase()} tones.` : "",
    style ? `The visual direction is ${style.toLowerCase()}.` : "",
    input.material
      ? `Product details provided by the seller:\n${input.material}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const warnings = [
    "Yerel kurallı taslaktır. Görselin içeriği otomatik tanınmadı; ana motif, renk ve stil kullanıcı girdisinden alınır.",
    "Başlık ve açıklama şablondan oluşturuldu; yayınlamadan önce görselle uyumunu kontrol et.",
  ];
  if (!input.material)
    warnings.push(
      "Malzeme, ölçü, kurulum ve teslimat bilgileri verilmedi; açıklamaya eklenmedi.",
    );
  if (evidence.length < 13)
    warnings.push(
      `${evidence.length} tag araştırma verisiyle eşleşiyor; kalanlar verdiğin tarif ve genel ürün ifadelerinden türetildi.`,
    );
  if (/[çğıöşü]/i.test([subject, color, style].join(" ")))
    warnings.push(
      "Bazı kelimeler yerel sözlükte yok. İngilizce listing için tarif alanlarını İngilizce düzenleyebilirsin.",
    );
  const result = listingResultSchema.parse({
    imageRead: false,
    visualSummary: `Kullanıcı tarifi: ${[subject, color, style].filter(Boolean).join(" · ")}. Görsel yalnız kayıt için saklandı; otomatik içerik analizi yapılmadı.`,
    title,
    tags: chosen,
    description,
    rationale: evidence.length
      ? `Yerel kelime eşleştirmesi: ${evidence.map((e) => `${e.term} (${e.sourceDate})`).join("; ")}. Sıralama önce tarif uyumuna, sonra mevcut arama/rekabet değerlerine dayanır; yalnız kelime araştırmasıdır; eRank CTR’si kendi ilan performansı değildir. Eksik arama/rekabet metriği sayısal karşılaştırmaya alınmaz; satış veya başarı olasılığı hesaplanmaz.`.slice(
          0,
          1200,
        )
      : "Verilen tarifle uyuşan araştırma kelimesi bulunamadı. Tagler kullanıcı tarifinden ve genel ürün ifadelerinden türetildi; arama hacmi kanıtı yok.",
    warnings,
  });
  return { result, evidence };
}
