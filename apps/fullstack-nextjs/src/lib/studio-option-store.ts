import { db } from "./db";
import { fieldOptions, normalizeOption } from "./studio-options";
import catalog from "../../data/lessons/catalog.json";
export async function rememberBriefOptions(payload: unknown) {
  const d = payload as {
    custom?: Record<string, unknown>;
    values?: Record<string, unknown>;
  };
  if (!d?.custom || !d.values) return;
  for (const f of catalog.fields) {
    const value = d.custom[f.id];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 1000 ||
      !(d.values[f.id] === "__other__" || d.values[f.id] === value)
    )
      continue;
    const normalized = normalizeOption(value);
    if (fieldOptions(f.id).some((v) => normalizeOption(v) === normalized))
      continue;
    await db.studioOption.upsert({
      where: { fieldId_normalized: { fieldId: f.id, normalized } },
      create: {
        fieldId: f.id,
        value: value.trim().replace(/\s+/g, " "),
        normalized,
      },
      update: {},
    });
  }
}
