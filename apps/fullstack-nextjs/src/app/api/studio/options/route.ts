import { db } from "@/lib/db";
import { normalizeOption } from "@/lib/studio-options";
import { localMutation } from "@/lib/image-connection";
import catalog from "../../../../../data/lessons/catalog.json";
import { z } from "zod";
export async function GET() {
  try {
    return Response.json(
      await db.studioOption.findMany({
        select: { fieldId: true, value: true },
        orderBy: { createdAt: "asc" },
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Kişisel seçenekler okunamadı." },
      { status: 500 },
    );
  }
}
export async function POST(r: Request) {
  try {
    localMutation(r);
    const d = z
      .object({
        fieldId: z
          .string()
          .refine((v) => catalog.fields.some((f) => f.id === v)),
        value: z
          .string()
          .trim()
          .min(1)
          .max(1000)
          .refine((v) => v !== "__other__"),
      })
      .parse(await r.json());
    const normalized = normalizeOption(d.value);
    const row = await db.studioOption.upsert({
      where: { fieldId_normalized: { fieldId: d.fieldId, normalized } },
      create: { ...d, value: d.value.replace(/\s+/g, " "), normalized },
      update: {},
    });
    return Response.json({ fieldId: row.fieldId, value: row.value });
  } catch {
    return Response.json(
      {
        error:
          "Seçenek eklenemedi. Boş olmayan, en çok 1000 karakterlik değer gir.",
      },
      { status: 400 },
    );
  }
}
