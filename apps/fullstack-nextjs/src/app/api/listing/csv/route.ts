import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import {
  csvSettingsSchema,
  csvTable,
  detectMapping,
  parseResearchCsv,
  hash,
  observationIdentity,
  comparableKey,
  type CsvRecord,
} from "@/lib/csv-research";
import { analyseResearch, reportVersion } from "@/lib/csv-research-report";
export const runtime = "nodejs";
const json = (x: unknown) =>
  JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
export async function GET(r: Request) {
  const u = new URL(r.url),
    download = u.searchParams.get("download");
  if (download) {
    const f = await db.keywordCsvFile.findUnique({ where: { sha: download } });
    if (!f)
      return Response.json({ error: "Dosya bulunamadı." }, { status: 404 });
    return new Response(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=original-erank.csv",
        "Cache-Control": "private, no-store",
      },
    });
  }
  const batches = await db.keywordCsvBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      fileSha: true,
      settings: true,
      stats: true,
      createdAt: true,
      file: { select: { name: true } },
    },
  });
  if (u.searchParams.get("history") === "1")
    return Response.json(
      { batches },
      { headers: { "Cache-Control": "no-store" } },
    );
  const rows = await db.keywordCsvObservation.findMany({
    orderBy: [{ observedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    include: { batch: { select: { file: { select: { name: true } } } } },
  });
  const watch = await db.keywordWatch.findMany({ select: { term: true } });
  const filters = {
    market: u.searchParams.get("market") || "US",
    query: (u.searchParams.get("q") || "").slice(0, 120),
  };
  const fingerprint = hash({
    version: reportVersion,
    month: new Date().toISOString().slice(0, 7),
    ids: rows.map((r) => r.id),
    watch: watch.map((r) => r.term).sort(),
    filters,
  });
  const old = await db.keywordCsvReport.findUnique({ where: { fingerprint } });
  const report =
    old?.result ||
    analyseResearch(
      rows.map((r) => ({
        ...r,
        sourceFile: r.batch.file.name,
        metrics: r.metrics as unknown as CsvRecord["metrics"],
      })),
      watch.map((r) => r.term),
      filters,
    );
  if (!old && !filters.query)
    await db.keywordCsvReport.upsert({
      where: { fingerprint },
      create: { fingerprint, result: json(report) },
      update: {},
    });
  return Response.json(
    { report, batches, cached: !!old },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(r: Request) {
  const completed: string[] = [];
  try {
    localMutation(r);
    const reader = r.body?.getReader();
    if (!reader) throw Error("Dosya seç.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const x = await reader.read();
      if (x.done) break;
      length += x.value.length;
      if (length > 22 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Toplam en fazla 20 MB CSV yükle.");
      }
      chunks.push(x.value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": r.headers.get("content-type") || "" },
    }).formData();
    const files = form.getAll("files");
    if (
      !files.length ||
      files.length > 10 ||
      files.some((f) => !(f instanceof File) || f.size > 2 * 1024 * 1024)
    )
      throw Error("Bir seferde 1–10 CSV; dosya başına en fazla 2 MB.");
    const mode = String(form.get("mode") || "inspect");
    if (!["inspect", "preview", "commit"].includes(mode))
      throw Error("Geçersiz işlem.");
    const configs = JSON.parse(String(form.get("settings") || "[]"));
    if (!Array.isArray(configs)) throw Error("Dosya ayarları okunamadı.");
    const results = [];
    for (const [index, file] of (files as File[]).entries()) {
      const bytes = Buffer.from(await file.arrayBuffer());
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw Error(file.name + ": UTF-8 CSV olarak kaydet.");
      }
      const table = csvTable(text),
        sha = hash(bytes.toString("base64"));
      const profile = await db.keywordCsvProfile.findUnique({
        where: { signature: table.signature },
      });
      const saved = profile?.settings as Record<string, unknown> | undefined;
      const settings = csvSettingsSchema.parse(
        configs[index] || {
          ...saved,
          period: "",
          observedAt: "",
          mapping: {
            ...detectMapping(table.headers),
            ...((saved?.mapping || {}) as Record<string, string>),
          },
        },
      );
      if (mode === "inspect") {
        results.push({
          name: file.name,
          sha,
          headers: table.headers,
          signature: table.signature,
          total: table.rows.length,
          settings: {
            ...settings,
            mapping: { ...detectMapping(table.headers), ...settings.mapping },
          },
        });
        continue;
      }
      const parsed = parseResearchCsv(text, settings);
      const fingerprint = hash({ sha, settings });
      const existingBatch = await db.keywordCsvBatch.findUnique({
        where: { fingerprint },
      });
      const old = await db.keywordCsvObservation.findMany({
        where: {
          term: { in: [...new Set(parsed.records.map((x) => x.term))] },
        },
        orderBy: { createdAt: "asc" },
      });
      const identities = new Set(old.map((x) => x.fingerprint));
      const latest = new Map(
        old.map((x) => [
          [
            comparableKey(x as unknown as CsvRecord),
            x.period,
            x.observedAt,
          ].join("|"),
          x.fingerprint,
        ]),
      );
      let repeated = 0,
        revisions = 0;
      const additions = parsed.records.filter((x) => {
        if (identities.has(observationIdentity(x))) {
          repeated++;
          return false;
        }
        const key = [comparableKey(x), x.period, x.observedAt].join("|");
        if (latest.has(key)) revisions++;
        latest.set(key, observationIdentity(x));
        identities.add(observationIdentity(x));
        return true;
      });
      const stats = {
        total: parsed.total,
        valid: parsed.records.length,
        invalid: parsed.errors.length,
        duplicates: parsed.duplicates,
        repeated,
        newRows: additions.length,
        revisions,
        errors: parsed.errors,
      };
      if (mode === "preview") {
        results.push({
          name: file.name,
          sha,
          settings,
          stats,
          sample: parsed.records.slice(0, 5),
          reused: !!existingBatch,
        });
        continue;
      }
      if (existingBatch) {
        results.push({
          name: file.name,
          reused: true,
          id: existingBatch.id,
          stats: existingBatch.stats,
        });
        continue;
      }
      if (parsed.errors.length && form.get("allowPartial") !== "true")
        throw Error(
          file.name +
            ": hatalı satırlar var. Önizlemeyi düzelt veya yalnız geçerli satırların aktarımını açıkça onayla.",
        );
      if (revisions && form.get("acceptRevisions") !== "true")
        throw Error(
          file.name +
            ": aynı ölçümde farklı değer var. Düzeltmeleri yeni sürüm olarak kabul et seçeneğini onayla.",
        );
      if (!parsed.records.length)
        throw Error(file.name + ": aktarılacak geçerli satır yok.");
      const batch = await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(71405232)`;
          const prior = await tx.keywordCsvBatch.findUnique({
            where: { fingerprint },
          });
          if (prior) return prior;
          const fresh = await tx.keywordCsvObservation.findMany({
            where: { term: { in: [...new Set(additions.map((x) => x.term))] } },
            select: {
              term: true,
              market: true,
              platform: true,
              source: true,
              definition: true,
              period: true,
              observedAt: true,
              fingerprint: true,
            },
          });
          const conflict = additions.some((x) =>
            fresh.some(
              (y) =>
                comparableKey(x) === comparableKey(y as unknown as CsvRecord) &&
                x.period === y.period &&
                x.observedAt === y.observedAt &&
                y.fingerprint !== observationIdentity(x),
            ),
          );
          if (conflict && form.get("acceptRevisions") !== "true")
            throw Error(
              "Bu arada aynı ölçüm için başka değer aktarıldı. Önizlemeyi yenile ve sürüm tercihini kontrol et.",
            );
          await tx.keywordCsvFile.upsert({
            where: { sha },
            create: { sha, name: file.name, bytes },
            update: {},
          });
          const batch = await tx.keywordCsvBatch.create({
            data: {
              fingerprint,
              fileSha: sha,
              settings: json(settings),
              stats: json(stats),
            },
          });
          const inserted = await tx.keywordCsvObservation.createMany({
            data: additions.map((x) => ({
              ...x,
              metrics: json(x.metrics),
              fingerprint: observationIdentity(x),
              batchId: batch.id,
            })),
            skipDuplicates: true,
          });
          await tx.keywordCsvBatch.update({
            where: { id: batch.id },
            data: { stats: json({ ...stats, inserted: inserted.count }) },
          });
          await tx.keywordCsvProfile.upsert({
            where: { signature: table.signature },
            create: {
              signature: table.signature,
              settings: json({ ...settings, period: "", observedAt: "" }),
            },
            update: {
              settings: json({ ...settings, period: "", observedAt: "" }),
            },
          });
          return batch;
        },
        { timeout: 60000 },
      );
      completed.push(file.name);
      results.push({ name: file.name, id: batch.id, stats });
    }
    return Response.json({ files: results });
  } catch (e) {
    return Response.json(
      {
        completed,
        error:
          (completed.length
            ? `${completed.length} dosya tamamlandı; geçmişte korunuyor. Sonraki dosya alınamadı: `
            : "") + (e instanceof Error ? e.message : "CSV alınamadı."),
      },
      { status: 400 },
    );
  }
}
