import { z } from "zod";
import template from "../../data/lessons/review-template.json";
const physical = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().finite().min(1).max(10000).nullable(),
);
export const analysisInput = z.object({
  title: z.string().trim().min(1).max(160),
  mode: z.enum(["auto", "pattern", "mural", "continuous", "motif"]),
  focus: z.string().max(2000),
  notes: z.string().max(5000),
  wallWidth: physical,
  wallHeight: physical,
});
export function resolution(
  width: number,
  height: number,
  wallWidth: number | null,
  wallHeight: number | null,
) {
  return {
    ratio: Number((width / height).toFixed(3)),
    ppiX: wallWidth ? Number((width / (wallWidth / 2.54)).toFixed(1)) : null,
    ppiY: wallHeight ? Number((height / (wallHeight / 2.54)).toFixed(1)) : null,
  };
}
export function reviewPrompt(a: {
  mode: string;
  focus: string;
  notes: string;
  width: number;
  height: number;
  wallWidth: number | null;
  wallHeight: number | null;
}) {
  return `${template.reviewTemplate}\n\nTasarım türü: ${a.mode}\nÖncelikli inceleme: ${a.focus}\nEk talep: ${a.notes}\nDosya: ${a.width} × ${a.height} px\nHedef fiziksel ölçü: ${a.wallWidth ?? "belirtilmedi"} × ${a.wallHeight ?? "belirtilmedi"} cm\nYerel teknik ölçüm: ${JSON.stringify(resolution(a.width, a.height, a.wallWidth, a.wallHeight))}\nBu talebi değerlendirirken ayrıca eklediğim görseli kullan. Görsel ekli değilse değerlendirme yapma, görseli iste.`;
}
