import { z } from "zod";
export const designInput = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
});
export const skuInput = z.object({
  designId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,59}$/),
  label: z.string().trim().min(1).max(200),
});
export const sourceInput = z.object({
  prompt: z.string().trim().min(1).max(20000),
  sourceUrl: z
    .string()
    .url()
    .refine((v) => ["https:", "http:"].includes(new URL(v).protocol))
    .optional(),
  jobId: z.string().max(200).optional(),
  model: z.string().max(100).optional(),
  seed: z.string().max(100).optional(),
});
export function detectFormat(b: Buffer) {
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "png";
  if (
    ["49492a00", "4d4d002a", "49492b00", "4d4d002b"].includes(
      b.subarray(0, 4).toString("hex"),
    )
  )
    return "tiff";
  if (b.subarray(0, 4).toString() === "8BPS" && b.readUInt16BE(4) === 1)
    return "psd";
  throw new Error(
    "Yalnızca geçerli PNG, TIFF veya PSD dosyaları kabul edilir.",
  );
}
