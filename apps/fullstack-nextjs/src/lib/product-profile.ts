import { z } from "zod";
const nullableNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.number().finite().min(min).max(max).nullable(),
  );
export const profileSchema = z
  .object({
    descriptionStandard: z.enum(["custom", "qoop-2026-10-28", "logessa-2026-10-29"]).default("custom"),
    targetMarket: z
      .enum(["US", "UK", "CA", "AU", "DE", "unknown"])
      .default("US"),
    listingLanguage: z.literal("en").default("en"),
    saleForm: z
      .enum(["unknown", "physical-wallpaper", "physical-mural"])
      .default("unknown"),
    brandVoice: z
      .string()
      .trim()
      .max(500)
      .default("Clear, calm, specific; no exaggerated claims."),
    excludedPhrases: z.string().trim().max(500).default(""),
    name: z.string().trim().min(1).max(100).default("LOGESSA ürün profili"),
    unit: z.enum(["cm", "in"]).default("cm"),
    muralWidth: nullableNumber(0.1, 10000),
    muralHeight: nullableNumber(0.1, 10000),
    muralPanels: z.number().int().min(1).max(500).nullable().default(null),
    customSizing: z.string().trim().max(400).default(""),
    printingInks: z.string().trim().max(250).default(""),
    careInstructions: z.string().trim().max(250).default(""),
    panelWidth: nullableNumber(0.1, 1000),
    overlap: nullableNumber(0, 100),
    heights: z.array(z.number().positive().max(2000)).max(30).default([]),
    targetPpi: nullableNumber(20, 1200),
    sampleUnit: z.enum(["cm", "in"]).nullable().default(null),
    sampleWidth: nullableNumber(0.1, 500),
    sampleHeight: nullableNumber(0.1, 500),
    samplePrice: z.string().trim().max(80).default(""),
    materials: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          details: z.string().trim().max(400),
        }),
      )
      .max(8)
      .default([]),
    orderUnit: z.enum(["unknown", "panel", "wall"]).default("unknown"),
    shopName: z.string().trim().max(100).default(""),
    productionLocation: z.string().trim().max(120).default(""),
    productionPartner: z.string().trim().max(120).default(""),
    processing: z.string().trim().max(150).default(""),
    shipping: z.string().trim().max(200).default(""),
    surface: z.string().trim().max(200).default(""),
    toolkit: z.string().trim().max(200).default(""),
    returns: z.string().trim().max(300).default(""),
    technicalNotes: z.string().trim().max(1000).default(""),
    confirmed: z.boolean().default(false),
  })
  .superRefine((p, c) => {
    if (
      p.panelWidth !== null &&
      p.overlap !== null &&
      p.overlap >= p.panelWidth
    )
      c.addIssue({
        code: "custom",
        message: "Bindirme panel genişliğinden küçük olmalı.",
      });
  });
export type ProductProfile = z.infer<typeof profileSchema>;
export const blankProfile = (): ProductProfile => profileSchema.parse({});
export const toCm = (n: number, unit: "cm" | "in") =>
  unit === "in" ? n * 2.54 : n;
export const invalidClaim =
  /\b(non[- ]?toxic|chemical[- ]?free|safe for babies|damage[- ]?free|highest[- ]quality|made in (?:the )?usa)\b/i;
export function technicalProfileText(p: ProductProfile) {
  const {
    brandVoice,
    excludedPhrases,
    targetMarket,
    listingLanguage,
    saleForm,
    ...technical
  } = p;
  return JSON.stringify(technical);
}
export function profileWarnings(p: ProductProfile) {
  const warnings: string[] = [];
  if (!p.confirmed)
    warnings.push(
      "Ürün bilgileri henüz doğrulanmadı; listing teknik metnine otomatik aktarılmaz.",
    );
  if (p.panelWidth === null || p.overlap === null)
    warnings.push("Panel genişliği/bindirme bilinmiyor; panel hesabı kapalı.");
  if (p.targetPpi === null)
    warnings.push(
      "Üretici hedef PPI belirtilmedi; baskı yeterliliği onaylanamaz.",
    );
  if (invalidClaim.test(technicalProfileText(p)))
    warnings.push(
      "Genel sağlık/üstünlük/menşe iddiası var; doğrulanmadan listing metnine alınmaz.",
    );
  return warnings;
}
export function panelCount(widthCm: number, p: ProductProfile) {
  if (p.panelWidth === null || p.overlap === null) return null;
  const width = toCm(p.panelWidth, p.unit),
    overlap = toCm(p.overlap, p.unit),
    visible = width - overlap;
  return {
    count: Math.ceil(Number((widthCm / visible).toFixed(10))),
    visibleWidthCm: visible,
    totalPanelWidthCm: width,
    overlapCm: overlap,
    convention:
      "Her panel için görünen genişlik üzerinden muhafazakâr hesap; ilk/son panel ve kesim payı ayrıca doğrulanmalı.",
  };
}
export const prepSchema = z.object({
  assetId: z.string().min(1),
  mode: z.enum(["pattern", "mural", "continuous", "motif"]),
  role: z.enum(["tile", "wall-master"]),
  wallWidthCm: nullableNumber(0.1, 10000),
  wallHeightCm: nullableNumber(0.1, 10000),
  repeatWidthCm: nullableNumber(0.1, 2000),
  repeatHeightCm: nullableNumber(0.1, 2000),
  material: z.string().trim().max(100).default(""),
  seamReviewed: z.boolean().default(false),
  colorReviewed: z.boolean().default(false),
  sample: z.enum(["pending", "approved", "waived"]).default("pending"),
  sampleNote: z.string().trim().max(1000).default(""),
  aiUsed: z.enum(["yes", "no", "unknown"]).default("unknown"),
  approve: z.boolean().default(false),
  notes: z.string().trim().max(1500).default(""),
});
export type PreparationInput = z.infer<typeof prepSchema>;
export function prepareDesign(
  input: PreparationInput,
  asset: {
    width: number | null;
    height: number | null;
    sha256: string;
    format: string;
  },
  p: ProductProfile | null,
) {
  const patternTile = input.mode === "pattern" && input.role === "tile";
  const w = patternTile ? input.repeatWidthCm : input.wallWidthCm,
    h = patternTile ? input.repeatHeightCm : input.wallHeightCm;
  const ppiX = asset.width && w ? asset.width / (w / 2.54) : null,
    ppiY = asset.height && h ? asset.height / (h / 2.54) : null;
  const blockers: string[] = [];
  if (!asset.width || !asset.height)
    blockers.push(
      "Dosya piksel ölçüleri okunamadı; PSD arşivi doğrudan baskı onayı alamaz.",
    );
  if (!w || !h)
    blockers.push(
      patternTile
        ? "Fiziksel tekrar ölçüsü gerekli."
        : "Duvar/master fiziksel ölçüsü gerekli.",
    );
  if (!p?.confirmed) blockers.push("Doğrulanmış ürün profili gerekli.");
  if (!p?.targetPpi) blockers.push("Hedef PPI bilinmiyor.");
  else if (ppiX !== null && ppiY !== null && Math.min(ppiX, ppiY) < p.targetPpi)
    blockers.push("Efektif çözünürlük belirlenen hedef PPI altında.");
  if (!input.material || !p?.materials.some((m) => m.name === input.material))
    blockers.push("Profilden geçerli malzeme seçilmeli.");
  if (input.mode !== "motif" && !input.seamReviewed)
    blockers.push(
      "Birleşim/kenar önizlemesi henüz kullanıcı tarafından onaylanmadı.",
    );
  if (!input.colorReviewed)
    blockers.push("Renk ve görünüm kontrolü onaylanmadı.");
  if (
    input.sample === "pending" ||
    (input.sample === "waived" && !input.sampleNote.trim())
  )
    blockers.push("Numune onayı veya numuneden vazgeçme gerekçesi gerekli.");
  if (
    asset.width &&
    asset.height &&
    w &&
    h &&
    Math.abs(asset.width / asset.height / (w / h) - 1) > 0.01
  )
    blockers.push(
      "Görsel oranı ile fiziksel ölçü oranı farklı; germe/kırpma planı netleştirilmeli.",
    );
  const panels =
    p && input.wallWidthCm ? panelCount(input.wallWidthCm, p) : null;
  if (input.role === "wall-master" && !panels)
    blockers.push("Panel planı için panel genişliği ve bindirme gerekli.");
  if (p && invalidClaim.test(technicalProfileText(p)))
    blockers.push("Ürün profilinde doğrulanmamış genel iddia var.");
  return {
    assetHash: asset.sha256,
    ppiX: ppiX === null ? null : Math.round(ppiX * 10) / 10,
    ppiY: ppiY === null ? null : Math.round(ppiY * 10) / 10,
    panels,
    blockers,
    status: blockers.length
      ? "CHECKS_PENDING"
      : input.approve
        ? input.role === "tile"
          ? "SOURCE_REVIEWED"
          : "MASTER_MANUALLY_APPROVED"
        : "READY_FOR_REVIEW",
    scope:
      input.role === "tile"
        ? "Tekrar karosu onayı, sipariş masterı değildir."
        : "Kullanıcı teknik değerlendirmesi; üretici kabulü veya otomatik baskı garantisi değildir.",
    checks: {
      seam: "MANUAL_REVIEW_ONLY",
      sample: input.sample,
      color: input.colorReviewed,
    },
    masterExport: "NOT_GENERATED",
    notes: input.notes,
  };
}
