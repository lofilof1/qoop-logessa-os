import { z } from "zod";
const metric = z
  .string()
  .trim()
  .max(20)
  .refine(
    (v) => !v || /^(?:<\s*)?\d+(?:[.,]\d+)?%?$/.test(v),
    "Sayı veya <20 gir; bilinmiyorsa boş bırak. Binlik ayırıcı kullanma.",
  );
export const observationSchema = z.object({
  term: z.string().trim().toLowerCase().min(2).max(120),
  observedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v);
      return (
        Number.isFinite(+d) &&
        d.toISOString().slice(0, 10) === v &&
        v <= new Date().toISOString().slice(0, 10)
      );
    }, "Geçerli, gelecekte olmayan ölçüm tarihi gir."),
  market: z.string().trim().min(2).max(60),
  searches: metric,
  clicks: metric,
  competition: metric,
  ctr: metric,
  notes: z.string().trim().max(1000),
});
export const watchSchema = z.object({
  term: z.string().trim().toLowerCase().min(2).max(120),
  category: z.string().trim().min(1).max(40),
  priority: z.coerce.number().int().min(1).max(3),
  status: z.enum(["active", "paused"]),
  reason: z.string().trim().max(500),
});
export function watchCsv(rows: Record<string, unknown>[]) {
  const keys = [
    "term",
    "category",
    "priority",
    "status",
    "observedAt",
    "market",
    "searches",
    "clicks",
    "competition",
    "ctr",
    "notes",
  ];
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
