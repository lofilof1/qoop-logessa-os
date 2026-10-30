import {
  briefSchema,
  creativeBasis,
  selected,
  vectorMedium,
  type StudioData,
} from "./studio";
import { fieldOptions } from "./studio-options";
export type ComposerOptions = {
  preserveAspect?: boolean;
  preserveStyle?: boolean;
};
function subjectFamily(motif: string) {
  const s = motif.toLocaleLowerCase("tr");
  if (/\b(tree|forest|woodland)\b|ağaç|orman/.test(s)) return "landscape";
  if (
    /zeytin|dalı|yaprak|çiçek|botanik|\b(olive|branch|leaf|leaves|floral|flower|botanical)\b/.test(
      s,
    )
  )
    return "botanical";
  if (/geometr|soyut|\b(abstract|circle|square)\b/.test(s)) return "geometric";
  if (/balık|deniz|mercan|\b(fish|ocean|coral|sea)\b/.test(s)) return "marine";
  if (/kuş|kelebek|tavşan|\b(bird|butterfly|rabbit|animal)\b/.test(s))
    return "animal";
  if (
    /mimari|kasaba|köy|evler|\b(village|architecture|buildings|town)\b/.test(s)
  )
    return "architecture";
  return "neutral";
}
export function composeStudio(
  input: StudioData,
  options: ComposerOptions = {},
): StudioData {
  if (!selected(input, "primary").trim())
    throw Error("Önce ana motifini belirt.");
  const d = structuredClone(input);
  const manual = new Set(input.manualFields || []);
  if (input.creativePlan) {
    try {
      const baseline = JSON.parse(input.creativePlan.basis);
      for (const key of Object.keys(input.values)) {
        if (
          input.values[key] !== baseline.values?.[key] ||
          input.custom[key] !== baseline.custom?.[key]
        )
          manual.add("values." + key);
      }
      for (const key of [
        "density",
        "quietArea",
        "heroHeight",
        "supportSize",
        "waterArea",
        "horizon",
        "rotation",
      ] as const)
        if (input[key] !== baseline[key]) manual.add(key);
    } catch {}
  }
  const finish = () => {
    for (const field of manual) {
      if (field.startsWith("values.")) {
        const id = field.slice(7);
        if (id === "aspect" && d.mode === "pattern") continue;
        d.values[id] = input.values[id];
        if (input.custom[id] !== undefined) d.custom[id] = input.custom[id];
        else delete d.custom[id];
      } else if (
        [
          "density",
          "quietArea",
          "heroHeight",
          "supportSize",
          "waterArea",
          "horizon",
          "rotation",
          "tileWidth",
          "tileHeight",
          "heroPhysicalCm",
        ].includes(field)
      ) {
        Object.assign(d, { [field]: input[field as keyof StudioData] });
      }
    }
    d.manualFields = [...manual];
    if (vectorMedium(d))
      for (const [id, value] of Object.entries({
        styleFamily: "Flat vector illustration",
        surface: "Düz renk alanları",
        edges: "Keskin",
      }))
        if (!manual.has("values." + id)) {
          d.values[id] = value;
          d.custom[id] = value;
        }
    if (d.creativePlan) d.creativePlan.basis = creativeBasis(d);
    return briefSchema.parse(d);
  };
  delete d.creativePlan;
  const family = subjectFamily(selected(d, "primary"));
  const put = (id: string, value: string) => {
    d.values[id] = fieldOptions(id).includes(value) ? value : "__other__";
    if (d.values[id] === "__other__") d.custom[id] = value;
    else delete d.custom[id];
  };
  if (d.mode === "edit") {
    const problem = selected(d, "problem");
    if (problem === "Çok kalabalık") {
      d.density = Math.max(1, Math.round(d.density * 0.75));
      d.quietArea = Math.min(90, 100 - d.density, Math.max(d.quietArea, 40));
    }
    if (problem === "Fazla kontrast") put("contrast", "Düşük");
    if (problem === "Motif çok büyük")
      d.heroHeight = Math.max(1, Math.round(d.heroHeight * 0.8));
    d.creativePlan = {
      version: "composition-v1",
      profile: "edit/protected",
      explanation:
        "Mevcut seçimlerini korudum; yalnız belirttiğin düzeltme hedefi için öneri hazırladım. Kaynak görsel görülmediği için görsel inceleme yapılmış sayılmaz.",
      instruction:
        "This is a revision brief without a supplied reference image. Keep the user's stated protected features unchanged and apply only the selected correction. Do not introduce a new scene or new supporting objects. Do not claim exact image preservation, repaired edges or visual inspection without inspecting the actual result.",
      basis: creativeBasis(d),
    };
    return finish();
  }
  // User constraints, actual dimensions, print targets and the main subject are never invented.
  for (const [id, value] of Object.entries({
    secondary: "Yok",
    secondaryExtra: "Yok",
    filler: "Yok",
  }))
    put(id, value);
  if (!options.preserveStyle) {
    const geometric = family === "geometric";
    const marine = family === "marine";
    for (const [id, value] of Object.entries({
      medium: geometric ? "Guaj" : "Suluboya",
      linework: "Belirgin kontur yok",
      edges: geometric ? "Hafif düzensiz" : "Yumuşak",
      surface: "Yumuşak geniş ton geçişleri",
      palette: marine
        ? "Gece mavisi / sıcak vurgu"
        : family === "neutral" || family === "architecture"
          ? "Toprak tonları"
          : "Adaçayı / kırık beyaz",
      contrast: "Düşük",
      saturation: "Soluk",
      detail: "Orta",
      styleFamily: "Original flat painted illustration",
      colorRole_background: "Kırık beyaz",
      colorRole_primary: marine
        ? "Muted blue"
        : family === "neutral" || family === "architecture"
          ? "Warm earth tones"
          : "Adaçayı",
      colorRole_secondary: "Sıcak gri",
      colorRole_accent: marine ? "Muted ochre" : "Zeytin yeşili",
      colorRole_shadow: "Sıcak gri",
    }))
      put(id, value);
  }
  const pattern = d.mode === "pattern",
    motif = d.mode === "motif";
  d.density = pattern ? 30 : motif ? 40 : 35;
  d.quietArea = pattern ? 40 : motif ? 45 : 40;
  d.heroHeight = motif ? 65 : 60;
  d.supportSize = motif ? 1 : 4;
  d.rotation = pattern ? 25 : 0;
  d.waterArea = 0;
  d.horizon = 45;
  let explanation =
    "Ana motifin dışında yeni nesne eklemeden, ölçek farkı ve sakin boşlukla hiyerarşi kurdum.";
  let instruction =
    "Keep the chosen main subject identifiable. Use a clear visual hierarchy, restrained detail and generous calm space; do not add unrelated objects.";
  if (pattern) {
    put("repeat", "Straight");
    put("distribution", "Jittered grid");
    put(
      "direction",
      family === "architecture" || family === "animal"
        ? "One-way"
        : "Non-directional",
    );
    d.rotation = family === "architecture" || family === "animal" ? 25 : 180;
    if (family === "botanical") {
      put("secondary", "İkincil dal");
      put("filler", "Küçük yaprak");
    }
    explanation =
      "Ana motifi baskın tuttum; daha küçük destekler ve değişen aralıklarla sakin bir tekrar ritmi seçtim. Kenar uyumu üretimden sonra kontrol edilmeli.";
    instruction =
      "Create a four-edge repeat tile with staggered spacing and varied intervals, no obvious rows or central emblem. Keep secondary marks smaller and quieter than the main motif. Match opposite edges without a border; preserve recognizable upright orientation for buildings and animals.";
  } else if (motif) {
    put("direction", "One-way");
    explanation =
      "Tek ana motife odaklandım: destek ve dolgu eklemedim; çevresinde temiz boşluk ve okunur bir siluet bıraktım.";
    instruction =
      "Render exactly one isolated main motif, not a scene, motif sheet or repeating pattern. Show its full silhouette with breathing room on all sides; no supporting objects. Use a clean plain background; do not claim transparency unless the output actually supports alpha.";
  } else {
    put(
      "scene",
      family === "landscape" || family === "architecture"
        ? "Manzara"
        : family === "botanical"
          ? "Botanik"
          : family === "geometric"
            ? "Geometrik / soyut"
            : "__other__",
    );
    if (d.values.scene === "__other__")
      d.custom.scene = "Composition based only on the selected main motif";
    put("depth", "Arka plan");
    put("flow", family === "botanical" ? "Dikey yükselen" : "Sakin / yönsüz");
    put(
      "composition",
      family === "landscape" || family === "architecture"
        ? "Katmanlı derinlik"
        : family === "botanical"
          ? "Zeminden yükselen"
          : family === "geometric"
            ? "Açık merkez"
            : "Tek odak",
    );
    if (family === "landscape") {
      put("secondary", "Göl");
      d.waterArea = 15;
      d.supportSize = 20;
      explanation =
        "Ana ağacı/ormanı baskın, gölü küçük ve sakin destek olarak kurguladım; katmanlı derinlik ve açık alanla göz akışını yumuşattım.";
    } else if (family === "botanical") {
      put("secondary", "İkincil dal");
      explanation =
        "Ana botanik motifi zeminden yükselen bir akışa aldım; ince destek dallarını geri planda ve daha düşük kontrastta tuttum.";
    }
    instruction =
      "Compose one cohesive full-bleed mural with a clear main-subject hierarchy, a quiet focal breathing area and subordinate supporting details. Scale supports to their scene role rather than equal prominence. Use painted depth and tonal layering, never a repeated wallpaper tile or a row of equal objects.";
    if (d.mode === "continuous") {
      put("continuity", "Tek büyük masterdan onaylı kesitler");
      put("cropPolicy", "Onaylı sabit kesitler");
      put("composition", "Katmanlı derinlik");
      explanation =
        "Tek vazgeçilmez merkez yerine yerel olarak dengeli odaklar seçtim. Küçük alanlar için kompozisyonu korunmuş kesitler ayrıca onaylanmalı.";
      instruction =
        "Compose a continuous panoramic scenic master with several locally balanced visual clusters linked by quiet transitions. Avoid a single indispensable central focal point and obvious repeated modules. Preserve complete silhouettes and calm boundaries in the planned crop windows. Individual crops and edge continuity require inspection after generation.";
    }
  }
  if (pattern) put("aspect", "1:1");
  if (!pattern && options.preserveAspect === false)
    put("aspect", motif ? "1:1" : "4:3");
  d.creativePlan = {
    version: "composition-v1",
    profile: `${d.mode}/${family}`,
    explanation,
    instruction,
    basis: creativeBasis(d),
  };
  return finish();
}
