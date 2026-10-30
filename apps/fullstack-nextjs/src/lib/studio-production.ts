import { gridDirection } from "./seam-grid";
import catalog from "../../data/lessons/catalog.json";
import {
  currentCreativePlan,
  vectorMedium,
  selected,
  type StudioData,
} from "./studio";
import template from "../../data/lessons/production-template.json";
export function generationSize(d: StudioData) {
  if (d.mode === "pattern") return "1024x1024"; // Native square canvas; archived output is normalized to 1000px.
  const [w, h] = selected(d, "aspect").split(":").map(Number);
  if (w / h > 3 || w / h < 1 / 3)
    throw new Error("Üretim oranı 1:3 ile 3:1 arasında olmalı.");
  // Match integer aspect ratios exactly on the provider's 16px grid, without cropping.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const wi = Math.round(w * 100),
    hi = Math.round(h * 100),
    g = gcd(wi, hi),
    a = wi / g,
    b = hi / g;
  const factor = Math.floor(1536 / (16 * Math.max(a, b)));
  if (factor < 1)
    throw new Error(
      "Bu oran için daha sade bir oran seç (ör. 4:3, 3:2, 16:9).",
    );
  const width = a * factor * 16,
    height = b * factor * 16;
  if (Math.min(width, height) < 256)
    throw new Error("Bu oran üretim boyutuna uygun değil.");
  return `${width}x${height}`;
}
export function productionPrompt(d: StudioData) {
  const types = {
    pattern: "Four-edge seamless repeat tile",
    mural: "Cohesive scenic mural",
    continuous: "Continuous scenic mural with locally balanced crop zones",
    motif: "Single motif or coordinated motif set",
    edit: "New interpretation based on a revision plan; no source image is supplied",
  };
  const fields = catalog.fields
    .filter(
      (f) =>
        f.modes.includes(d.mode) &&
        ![
          "variation",
          "referenceRole",
          "collectionRole",
          "launchWave",
        ].includes(f.id) &&
        !/^(Yok|Henüz|Belirlenmedi)/i.test(selected(d, f.id)),
    )
    .map((f) => {
      let value = selected(d, f.id);
      if (
        !vectorMedium(d) &&
        f.id === "styleFamily" &&
        /flat vector illustration/i.test(value)
      )
        value = "Illustration consistent with the selected artistic medium";
      if (vectorMedium(d)) {
        if (
          f.id === "styleFamily" &&
          /painted|watercolor|suluboya|guaj/i.test(value)
        )
          value = "Flat vector illustration";
        if (f.id === "surface" && /pigment|kâğıt|paper|ton geçiş/i.test(value))
          value = "Controlled solid fills";
      }
      return `${f.label}: ${value}`;
    })
    .join("\n");
  return [
    vectorMedium(d)
      ? "Create an original flat vector-style wallpaper illustration with clean paths, crisp shapes and controlled solid fills. Follow the current choices below; do not use watercolor, gouache, pigment washes or paper texture. This is a visual style request, not a claim of editable vector output."
      : template.intro,
    `Design type: ${types[d.mode]}.`,
    fields,
    d.mode === "pattern" ? gridDirection(d.seamGrid) : "",
    d.mode === "pattern"
      ? "Required final tile dimensions: exactly 1000 x 1000 pixels, square 1:1 canvas. Do not use a portrait or landscape tile. Exact exported dimensions and opposing-edge continuity must be verified after generation."
      : "",
    currentCreativePlan(d)
      ? `Art direction: ${
          vectorMedium(d)
            ? currentCreativePlan(d)!
                .instruction.replace(/painted depth/gi, "graphic depth")
                .replace(/paint texture/gi, "surface treatment")
            : currentCreativePlan(d)!.instruction
        }`
      : "",
    `Target composition: motif occupancy ${d.density}%; reserved quiet area ${d.quietArea}%.`,
    d.mode === "pattern"
      ? `Repeat target ${d.tileWidth} × ${d.tileHeight} cm; hero motif ${d.heroPhysicalCm} cm; rotation range ${d.rotation} degrees. Match opposing edges; avoid visible repeat seams.`
      : d.mode === "motif"
        ? `Motif height target ${d.heroHeight}% of canvas height; use only the selected motif grouping and supporting elements specified above.`
        : `Wall target ${d.wallWidth} × ${d.wallHeight} cm. Hero projected height ${d.heroHeight}%, support projected height ${d.supportSize}%, water area target ${d.waterArea}%, horizon ${d.horizon}%.`,
    d.mode === "continuous"
      ? `Keep crop zones compositionally balanced; requested crop width ${d.cropWidth} cm at offset ${d.cropOffset}%. Avoid a single indispensable central focal point.`
      : "",
    d.notes
      ? `Additional direction (user constraints take precedence over suggested defaults): ${d.notes}`
      : "",
    template.ending,
    "Physical measurements describe visual scale targets only, not certified output resolution or print readiness.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
