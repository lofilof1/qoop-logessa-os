import { z } from "zod";
export const stages = ["brief", "design", "review", "ready"] as const;
export const stageLabels: Record<string, string> = { brief: "Fikir & brief", design: "Tasarım", review: "Baskı kontrolü", ready: "İlana hazır" };
export const kindLabels: Record<string, string> = { pattern: "Tekrarlı desen", mural: "Duvar muralı", art: "Duvar sanatı" };
export const mockupSchema = z.object({
    scene: z.enum(["japandi","botanical","heritage","boho","studio","western"]).default("japandi"),
    wallWidthCm: z.number().min(1).max(2000).default(400),
    wallHeightCm: z.number().min(1).max(1000).default(300),
    repeatWidthCm: z.number().min(1).max(2000).default(58.42),
    panelWidthCm: z.number().min(1).max(500).default(58.42),
    offsetX: z.number().min(-2000).max(2000).default(0),
    offsetY: z.number().min(-2000).max(2000).default(0),
    lighting: z.enum(["source","shadows"]).default("source"),
    corners: z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).length(4).default([[0.015,0.04],[0.935,0.04],[0.935,0.89],[0.015,0.89]]),
    calibrated: z.boolean().default(false),
    guides: z.boolean().default(true),
}).default({});
export type MockupSettings = z.infer<typeof mockupSchema>;
export const bodySchema = z.object({
    collection: z.string().max(100).default(""), motif: z.string().max(200).default(""), palette: z.string().max(200).default(""), style: z.string().max(200).default(""), room: z.string().max(120).default(""), notes: z.string().max(8000).default(""), keyword: z.string().max(150).default(""), prompt: z.string().max(10000).default(""),
    widthPx: z.number().int().min(0).max(100000).default(0), heightPx: z.number().int().min(0).max(100000).default(0), widthCm: z.number().min(0).max(10000).default(0), heightCm: z.number().min(0).max(10000).default(0), targetDpi: z.number().min(30).max(1200).default(150),
    checks: z.object({ rights: z.boolean(), seams: z.boolean(), proof: z.boolean(), manufacturer: z.boolean() }).default({ rights: false, seams: false, proof: false, manufacturer: false }),
    title: z.string().max(300).default(""), tags: z.array(z.string().max(100)).max(30).default([]), description: z.string().max(20000).default(""), imageId: z.string().max(100).default(""),
    mockup: mockupSchema,
});
export type DesignBody = z.infer<typeof bodySchema>;
export const designInput = z.object({ name: z.string().trim().min(2).max(120), kind: z.enum(["pattern", "mural", "art"]), stage: z.enum(stages).default("brief"), body: bodySchema, version: z.number().int().positive().optional(), archived: z.boolean().optional() });
export type Design = {
    id: string;
    name: string;
    kind: string;
    stage: string;
    body: DesignBody;
    version: number;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
};
export const emptyBody = (): DesignBody => bodySchema.parse({});
export function printCheck(b: DesignBody) { const dpi = b.widthPx > 0 && b.heightPx > 0 && b.widthCm > 0 && b.heightCm > 0 ? Math.min(b.widthPx / (b.widthCm / 2.54), b.heightPx / (b.heightCm / 2.54)) : null; const ratio = b.widthPx > 0 && b.heightPx > 0 && b.widthCm > 0 && b.heightCm > 0 ? Math.abs((b.widthPx / b.heightPx) / (b.widthCm / b.heightCm) - 1) : null; return { dpi, ratio, resolution: dpi !== null && dpi >= b.targetDpi, aspect: ratio !== null && ratio < 0.01 }; }
const turkish = /[çğıöşüÇĞİÖŞÜ]|\b(ve|için|duvar|kağıdı|kâğıdı|desen|çiçek|yatak|odası|yeşil|mavi|siyah|beyaz|ile|ürün|baskı)\b/i;
export function listingIssues(b: DesignBody) { const issues: string[] = []; if (!b.title.trim())
    issues.push("İngilizce başlık ekle."); if (b.title.length > 140)
    issues.push("Başlığı 140 karaktere indir."); if (b.tags.length !== 13)
    issues.push("13 etiket tamamla."); if (b.tags.some(t => !t.trim() || t.length > 20))
    issues.push("Her etiket 1–20 karakter olmalı."); if (new Set(b.tags.map(t => t.trim().toLowerCase())).size !== b.tags.length)
    issues.push("Tekrarlanan etiketleri kaldır."); if (!b.description.trim())
    issues.push("İngilizce açıklama ekle."); if (turkish.test([b.title, b.description, ...b.tags].join(" ")))
    issues.push("Etsy metnindeki Türkçe ifadeleri İngilizceye çevir."); if (/\b(non[- ]?toxic|hand[- ]?drawn|AI[- ]?free|best[- ]?selling)\b/i.test([b.title, b.description, ...b.tags].join(" ")))
    issues.push("Doğrulanmamış ürün iddiasını kaldır."); return issues; }
export function readiness(d: {
    body: DesignBody;
    kind: string;
}) { const p = printCheck(d.body), issues = listingIssues(d.body); if (!p.resolution)
    issues.push("Hedef çözünürlüğü karşılayan master ölçülerini gir."); if (!p.aspect)
    issues.push("Baskı ve dosya oranını eşleştir."); if (!d.body.imageId)
    issues.push("Kendi master görselini yükle."); for (const [key, label] of Object.entries({ rights: "Kullanım hakkını", seams: d.kind === "pattern" ? "Kenar eşleşmesini" : "Kompozisyonu", proof: "Fiziksel provayı", manufacturer: "Üretici şartlarını" }))
    if (!d.body.checks[key as keyof DesignBody["checks"]])
        issues.push(`${label} kontrol et.`); return issues; }
export function buildPrompt(b: DesignBody, kind: string) { return `Create an original ${kind === "pattern" ? "seamless repeating wallpaper tile" : kind === "mural" ? "wall mural composition" : "wall art composition"}.\nMotif: ${b.motif || "[describe in English]"}.\nStyle: ${b.style || "[describe in English]"}.\nPalette: ${b.palette || "[describe in English]"}.\nIntended room: ${b.room || "[describe in English]"}.\n${kind === "pattern" ? "Match opposite edges in position, scale, light and color; verify a 3×3 repeat after generation." : kind === "mural" ? "One coherent master image; maintain a continuous scene across print panels." : "One balanced composition with clear negative space."}\nNo lettering, watermark, logo or product claims.\n${b.notes ? `Creative notes: ${b.notes}\n` : ""}${kind === "pattern" ? "--tile --ar 1:1" : "--ar 4:3"}`; }
export function profit(price: number, cost: number, shipping: number, feePercent: number, fixedFee: number) { const fees = price * feePercent / 100 + fixedFee, net = price - cost - shipping - fees; return { fees, net, margin: price > 0 ? net / price * 100 : 0 }; }
export function csvCell(value: unknown) { const s = String(value ?? ""); return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'; }
