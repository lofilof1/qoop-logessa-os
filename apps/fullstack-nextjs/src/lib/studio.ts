import { seamGridPlan } from "./seam-grid";
import { z } from "zod";
import { fieldOptions, marketOptions } from "./studio-options";
import catalog from "../../data/lessons/catalog.json";
export const modes = [
  "pattern",
  "mural",
  "continuous",
  "motif",
  "edit",
] as const;
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
export const briefSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    mode: z.enum(modes),
    catalogVersion: z.enum(["lessons-v1", "lessons-v1.1"]),
    values: z.record(z.string(), z.string().max(1000)),
    custom: z.record(z.string(), z.string().max(1000)),
    wallWidth: n(10, 2000),
    wallHeight: n(10, 1000),
    density: n(1, 95),
    quietArea: n(0, 90),
    heroHeight: n(1, 95),
    supportSize: n(1, 30),
    waterArea: n(0, 80),
    horizon: n(10, 90),
    cropWidth: n(10, 2000),
    cropOffset: n(0, 100),
    tileWidth: n(5, 200),
    tileHeight: n(5, 200),
    heroPhysicalCm: n(0.1, 300),
    rotation: n(0, 180),
    targetPpi: n(20, 600).nullable(),
    notes: z.string().max(5000),
    seamGrid: z
      .object({
        step: z.union([z.literal(50), z.literal(100), z.literal(200)]),
        leftRight: z.array(z.number().int().min(1).max(999)).max(19),
        topBottom: z.array(z.number().int().min(1).max(999)).max(19),
      })
      .refine(
        (g) =>
          [...g.leftRight, ...g.topBottom].every((n) => n % g.step === 0) &&
          new Set(g.leftRight).size === g.leftRight.length &&
          new Set(g.topBottom).size === g.topBottom.length,
        "Birleşim noktaları seçilen grid çizgilerinde ve tekil olmalı.",
      )
      .optional(),
    manualFields: z.array(z.string().max(100)).max(100).optional(),
    creativePlan: z
      .object({
        version: z.literal("composition-v1"),
        profile: z.string().max(80),
        explanation: z.string().max(1200),
        instruction: z.string().max(2500),
        basis: z.string().max(40000),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    for (const field of catalog.fields.filter((f) =>
      f.modes.includes(data.mode),
    )) {
      const value =
        (data.mode === "pattern" && field.id === "aspect"
          ? "1:1"
          : data.values[field.id]) ??
        (field.optional ? field.options[0] : undefined);
      if (
        !value ||
        !(
          fieldOptions(field.id).includes(value) ||
          value === "__other__" ||
          (data.custom[field.id]?.trim() === value && !!value.trim())
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["values", field.id],
          message: field.label + ": seçim gerekli.",
        });
      if (value === "__other__" && !data.custom[field.id]?.trim())
        ctx.addIssue({
          code: "custom",
          path: ["custom", field.id],
          message: field.label + ": Diğer açıklaması gerekli.",
        });
    }
    const ratio =
      data.mode === "pattern"
        ? "1:1"
        : data.values.aspect === "__other__"
          ? data.custom.aspect
          : data.values.aspect;
    if (
      !/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio || "") ||
      ratio.split(":").some((v) => Number(v) <= 0 || Number(v) > 100)
    )
      ctx.addIssue({
        code: "custom",
        path: ["values", "aspect"],
        message: "Tuval oranı 4:3 gibi pozitif iki sayı olmalı (en çok 100).",
      });
    if (data.mode === "continuous" && data.cropWidth > data.wallWidth)
      ctx.addIssue({
        code: "custom",
        path: ["cropWidth"],
        message: "Kesit eni master eninden büyük olamaz.",
      });
  });
export type StudioData = z.infer<typeof briefSchema>;
export function initialBrief(): StudioData {
  return {
    title: "Yeni tasarım çalışması",
    mode: "pattern",
    catalogVersion: "lessons-v1.1",
    values: Object.fromEntries(catalog.fields.map((f) => [f.id, f.options[0]])),
    custom: {},
    wallWidth: 400,
    wallHeight: 300,
    density: 30,
    quietArea: 30,
    heroHeight: 60,
    supportSize: 4,
    waterArea: 25,
    horizon: 40,
    cropWidth: 150,
    cropOffset: 20,
    tileWidth: 30,
    tileHeight: 40,
    heroPhysicalCm: 10,
    rotation: 25,
    targetPpi: null,
    notes: "",
  };
}
export function selected(d: StudioData, id: string) {
  if (d.mode === "pattern" && id === "aspect") return "1:1";
  return d.values[id] === "__other__"
    ? d.custom[id] || ""
    : d.values[id] || catalog.fields.find((f) => f.id === id)?.options[0] || "";
}
export function studioWarnings(d: StudioData) {
  const result: string[] = [];
  if (d.density + d.quietArea > 100)
    result.push(
      "Doluluk hedefi ile ayrılmış sakin alan toplamı %100’ü aşıyor; hedeflerin tanımını veya değerlerini gözden geçir.",
    );
  if (d.mode === "pattern" && selected(d, "repeat") === "Half-drop")
    result.push(
      "Half-drop için komşu kolon H/2 kaymalı; basit straight tile kenar testi tek başına yeterli değildir.",
    );
  if (d.mode === "pattern" && selected(d, "distribution") === "Poisson disk")
    result.push(
      "Poisson disk bir seçim olarak kaydedilir. Bu sürümde mesafe garantili dağılım motoru çalışmaz.",
    );
  if (d.mode === "continuous")
    result.push(
      "Her rastgele kesitte eksiksiz kompozisyon garanti edilmez. Korunan öğeler ve satın alınabilir kesitler gerçek görselde ayrıca onaylanmalı.",
    );
  if (!d.targetPpi)
    result.push(
      "Üreticinin hedef PPI değeri henüz girilmedi. Bu çalışma baskı onayı değildir.",
    );
  return result;
}
export function plannedCrop(d: StudioData) {
  const width = Math.min(d.wallWidth, d.cropWidth);
  return { left: ((d.wallWidth - width) * d.cropOffset) / 100, width };
}
export function structuredBrief(d: StudioData) {
  return {
    source: catalog.evidenceHash,
    catalogVersion: catalog.version,
    title: d.title,
    mode: d.mode,
    selections: catalog.fields
      .filter((f) => f.modes.includes(d.mode))
      .map((f) => ({
        id: f.id,
        label: f.label,
        value: selected(d, f.id),
        source: f.options.includes(selected(d, f.id))
          ? {
              lesson: f.lesson,
              page: f.page,
              origin: f.origin,
              url: f.sourceUrl,
            }
          : (() => {
              const evidence = (
                marketOptions.fields as Record<
                  string,
                  { value: string; phrase: string; keywordCount: number }[]
                >
              )[f.id]?.find((x) => x.value === selected(d, f.id));
              return evidence
                ? {
                    origin: "market_keywords",
                    snapshotDate: marketOptions.snapshotDate,
                    keywordCount: evidence.keywordCount,
                    phrase: evidence.phrase,
                  }
                : { origin: "user_custom" };
            })(),
      })),
    targets: {
      ...(d.mode === "pattern" ? { outputPixels: [1000, 1000] } : {}),
      wallCm: [d.wallWidth, d.wallHeight],
      tileCm: [d.tileWidth, d.tileHeight],
      heroPhysicalCm: d.heroPhysicalCm,
      motifOccupancyPercent: d.density,
      reservedQuietAreaPercent: d.quietArea,
      heroProjectedHeightPercent: d.heroHeight,
      supportProjectedHeightPercent: d.supportSize,
      waterAreaTargetPercent: d.waterArea,
      horizonPercent: d.horizon,
      rotationDegrees: d.rotation,
      targetPpi: d.targetPpi,
    },
    crop: d.mode === "continuous" ? plannedCrop(d) : undefined,
    ...(d.mode === "pattern" ? { seamGrid: seamGridPlan(d.seamGrid) } : {}),
    creativePlan: currentCreativePlan(d),
    notes: d.notes,
    validation: {
      status: "PLANNING_ONLY",
      imageInspected: false,
      seamTest: "NOT_RUN",
      physicalProof: "NOT_RUN",
      warnings: studioWarnings(d),
    },
  };
}
export function intervention(d: StudioData) {
  const problem = selected(d, "problem");
  if (/Kenar|Tekrar izi/.test(problem))
    return "Teknik repeat/panel incelemesi ve yerel onarım planla; yalnızca prompt değişikliğiyle çözülmüş sayma. (Ders 1.3, s.10; 1.6, s.19–20)";
  if (/Baskıda/.test(problem))
    return "Piksel/fiziksel ölçüyle efektif PPI ve motif boyunu hesapla; kaynakla aynı ölçekte karşılaştır. (Ders 1.4, s.12–13; 1.9, s.25–27)";
  if (problem === "Henüz yok")
    return "Seçimleri ve korunacak özellikleri sabitle; bir sonraki adım kontrollü üretim briefidir.";
  return "Seçilen sorunun ilgili değişkenini değiştir; stil kilidi ve diğer değişkenleri koruyarak önce/sonra karşılaştır. (Ders 1.3, s.10; 1.4, s.12–14)";
}

export function stableBriefJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return "[" + value.map(stableBriefJson).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => JSON.stringify(key) + ":" + stableBriefJson(v))
      .join(",") +
    "}"
  );
}

export function hydrateBrief(value: unknown): StudioData {
  const parsed = briefSchema.parse(value);
  return {
    ...parsed,
    catalogVersion: "lessons-v1.1",
    values: { ...initialBrief().values, ...parsed.values },
  };
}

export function creativeBasis(d: StudioData) {
  return stableBriefJson({
    mode: d.mode,
    values: d.values,
    custom: d.custom,
    density: d.density,
    quietArea: d.quietArea,
    heroHeight: d.heroHeight,
    supportSize: d.supportSize,
    waterArea: d.waterArea,
    horizon: d.horizon,
    rotation: d.rotation,
    tileWidth: d.tileWidth,
    tileHeight: d.tileHeight,
    heroPhysicalCm: d.heroPhysicalCm,
    wallWidth: d.wallWidth,
    wallHeight: d.wallHeight,
    cropWidth: d.cropWidth,
    cropOffset: d.cropOffset,
  });
}
export function currentCreativePlan(d: StudioData) {
  return d.creativePlan?.basis === creativeBasis(d)
    ? d.creativePlan
    : undefined;
}

export function changeStudioField(
  d: StudioData,
  key: keyof StudioData,
  value: unknown,
): StudioData {
  const fields = new Set(d.manualFields || []);
  if (key === "custom")
    for (const [id, v] of Object.entries(value as Record<string, string>)) {
      if (v !== d.custom[id]) fields.add("values." + id);
    }
  else if (
    !["title", "notes", "mode", "creativePlan", "manualFields"].includes(key)
  )
    fields.add(key);
  return { ...d, [key]: value, manualFields: [...fields] };
}
export function chooseStudioValue(
  d: StudioData,
  id: string,
  value: string,
): StudioData {
  return {
    ...d,
    values: { ...d.values, [id]: value },
    custom: { ...d.custom, ...(value !== "__other__" ? { [id]: value } : {}) },
    manualFields: [...new Set([...(d.manualFields || []), "values." + id])],
  };
}
export function vectorMedium(d: StudioData) {
  return /vekt[oö]r|vector/i.test(selected(d, "medium"));
}
