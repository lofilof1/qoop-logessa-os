import { createHash } from "node:crypto";
import { z } from "zod";
export const researchToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const hash = (v: unknown) =>
  createHash("sha256")
    .update(typeof v === "string" ? v : JSON.stringify(v))
    .digest("hex");
export const csvSettingsSchema = z.object({
  market: z
    .enum(["US", "UK", "CA", "AU", "Global", "unknown"])
    .default("unknown"),
  platform: z.enum(["Etsy", "other"]).default("Etsy"),
  source: z
    .enum(["erank-keyword", "competitor-listing", "other"])
    .default("erank-keyword"),
  definition: z.enum(["monthly", "rolling12", "unknown"]).default("unknown"),
  period: z.string().max(10).default(""),
  observedAt: z.string().max(10).default(""),
  numberFormat: z.enum(["auto", "en", "tr"]).default("auto"),
  mapping: z.record(z.string(), z.string().max(200)).default({}),
});
export type CsvSettings = z.infer<typeof csvSettingsSchema>;
export type Metric = {
  raw: string;
  kind: "exact" | "below" | "missing";
  value: number | null;
};
export const metricKeys = ["searches", "clicks", "competition", "ctr"] as const;
export type Metrics = Record<(typeof metricKeys)[number], Metric>;
export type CsvRecord = {
  sourceFile?: string;
  batchId?: string;
  row: number;
  term: string;
  market: string;
  platform: string;
  source: string;
  definition: string;
  period: string;
  observedAt: string;
  metrics: Metrics;
};
export const aliases: Record<string, string[]> = {
  term: [
    "keyword",
    "keywords",
    "term",
    "tag",
    "kelime",
    "anahtar kelime",
    "search term",
    "etiket",
  ],
  searches: [
    "average searches",
    "avg searches",
    "avg. searches",
    "searches",
    "aylik arama",
    "ortalama arama",
    "monthly searches",
  ],
  clicks: [
    "average clicks",
    "avg clicks",
    "avg. clicks",
    "clicks",
    "tik",
    "tiklama",
    "ortalama tiklama",
  ],
  competition: ["etsy competition", "competition", "rakip ilan", "rekabet"],
  ctr: ["average ctr", "avg ctr", "avg. ctr", "ctr"],
  market: ["country", "market", "ulke", "pazar"],
  period: ["month", "period", "ay", "donem"],
  observedAt: [
    "observedat",
    "observed at",
    "observed_at",
    "date",
    "tarih",
    "kontrol tarihi",
  ],
  definition: ["metric type", "definition", "period type", "metrik turu"],
};
const normal = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
export function csvTable(text: string) {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0];
  const count = (delimiter: string) => {
    let n = 0,
      q = false;
    for (let i = 0; i < first.length; i++) {
      if (first[i] === '"') q = !q;
      else if (!q && first[i] === delimiter) n++;
    }
    return n;
  };
  const delimiter = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (q && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else q = !q;
    } else if (!q && c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!q && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (q) throw Error("CSV tırnakları kapanmamış.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2)
    throw Error("Başlık ve veri satırları içeren CSV gerekli.");
  if (rows.length > 10001)
    throw Error("Dosya başına en fazla 10.000 satır; dosyayı bölerek yükle.");
  const headers = rows[0].map((x) => x.trim());
  if (new Set(headers.map(normal)).size !== headers.length)
    throw Error(
      "Aynı veya boş başlıklı sütunlar var; başlıkları benzersiz yap.",
    );
  if (headers.some((x) => !x)) throw Error("Boş sütun başlığı var.");
  return {
    headers,
    rows: rows.slice(1),
    delimiter,
    signature: hash(headers.map(normal)),
  };
}
export function detectMapping(headers: string[]) {
  const mapping: Record<string, string> = {};
  for (const [key, names] of Object.entries(aliases)) {
    const found = headers.filter((h) => names.includes(normal(h)));
    if (found.length === 1) mapping[key] = found[0];
  }
  return mapping;
}
export function csvMetric(
  raw: string,
  format: CsvSettings["numberFormat"],
): Metric {
  const original = raw.trim();
  if (!original || /^(unknown|n\/a|na|--?|bilinmiyor)$/i.test(original))
    return { raw: original, kind: "missing", value: null };
  const below = original.startsWith("<");
  let s = original.replace(/^<\s*/, "").replace(/%$/, "").replace(/\s/g, "");
  if (format === "en") {
    if (!/^\d+(?:,\d{3})*(?:\.\d+)?$/.test(s))
      throw Error("Sayı biçimi İngilizce seçimiyle uyuşmuyor: " + original);
    s = s.replaceAll(",", "");
  } else if (format === "tr") {
    if (!/^\d+(?:\.\d{3})*(?:,\d+)?$/.test(s))
      throw Error("Sayı biçimi Türkçe seçimiyle uyuşmuyor: " + original);
    s = s.replaceAll(".", "").replace(",", ".");
  } else {
    if (
      /[,.]\d{3}$/.test(s) ||
      (/[,.]/.test(s) && s.includes(",") && s.includes("."))
    )
      throw Error(
        "Sayı ayırıcı belirsiz; dosya için İngilizce/Türkçe sayı biçimi seç: " +
          original,
      );
    s = s.replace(",", ".");
  }
  const value = Number(s);
  if (!/^\d+(?:\.\d+)?$/.test(s) || !Number.isFinite(value) || value < 0)
    throw Error("Geçersiz metrik: " + original);
  return { raw: original, kind: below ? "below" : "exact", value };
}
export function validDate(s: string) {
  const d = new Date(s);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(+d) &&
    d.toISOString().slice(0, 10) === s &&
    s <= researchToday()
  );
}
export type ParsedResearch = {
  headers: string[];
  rows: string[][];
  delimiter: string;
  signature: string;
  mapping: Record<string, string>;
  records: CsvRecord[];
  errors: { row: number; error: string }[];
  total: number;
  duplicates: number;
  originalRows?: number;
  wideSeries?: boolean;
};
export function parseResearchCsv(
  text: string,
  settings: CsvSettings,
): ParsedResearch {
  const table = csvTable(text),
    mapping = { ...detectMapping(table.headers), ...settings.mapping };
  if (!mapping.term) throw Error("Kelime sütununu eşleştir.");
  for (const h of Object.values(mapping))
    if (h && !table.headers.includes(h))
      throw Error("Eşleştirilen sütun dosyada yok: " + h);
  if (
    !table.headers.some((h) => /^\d{4}-(0[1-9]|1[0-2])$/.test(h)) &&
    !metricKeys.some((k) => mapping[k])
  )
    throw Error("En az bir arama/tıklama/rekabet/CTR sütununu eşleştir.");
  const monthlyHeaders = table.headers.filter((h) =>
    /^\d{4}-(0[1-9]|1[0-2])$/.test(h),
  );
  if (monthlyHeaders.length && !mapping.period) {
    const quote = (v: string) => '"' + v.replaceAll('"', '""') + '"';
    const sourceRows: number[] = [];
    const expanded = [
      ["keyword", "month", "metric type", "searches", "country", "date"]
        .map(quote)
        .join(","),
    ];
    for (const [i, cells] of table.rows.entries()) {
      if (cells.length !== table.headers.length)
        throw Error(`Satır ${i + 2}: sütun sayısı başlıkla uyuşmuyor.`);
      const get = (k: string) =>
        mapping[k] ? cells[table.headers.indexOf(mapping[k])] : "";
      for (const month of monthlyHeaders) {
        expanded.push(
          [
            get("term"),
            month,
            "monthly",
            cells[table.headers.indexOf(month)],
            get("market") || settings.market,
            get("observedAt") || settings.observedAt,
          ]
            .map(quote)
            .join(","),
        );
        sourceRows.push(i + 2);
      }
    }
    const result = parseResearchCsv(expanded.join("\n"), {
      ...settings,
      definition: "monthly",
      period: "",
      mapping: {
        term: "keyword",
        period: "month",
        definition: "metric type",
        searches: "searches",
        market: "country",
        observedAt: "date",
      },
    });
    return {
      ...result,
      headers: table.headers,
      signature: table.signature,
      mapping,
      originalRows: table.rows.length,
      wideSeries: true,
      records: result.records.map((r) => ({
        ...r,
        row: sourceRows[r.row - 2],
      })),
      errors: result.errors.map((e) => ({ ...e, row: sourceRows[e.row - 2] })),
    };
  }
  const records: CsvRecord[] = [],
    errors: { row: number; error: string }[] = [];
  let duplicates = 0;
  const seen = new Set<string>();
  for (const [i, cells] of table.rows.entries()) {
    const row = i + 2;
    try {
      if (cells.length !== table.headers.length)
        throw Error("Sütun sayısı başlıkla uyuşmuyor.");
      const get = (k: string) =>
        mapping[k] ? cells[table.headers.indexOf(mapping[k])].trim() : "";
      const term = get("term").toLowerCase().replace(/\s+/g, " ");
      if (term.length < 2 || term.length > 120)
        throw Error("Kelime 2–120 karakter olmalı.");
      let market = get("market") || settings.market;
      const country: Record<string, string> = {
        usa: "US",
        "united states": "US",
        "united kingdom": "UK",
        canada: "CA",
        australia: "AU",
        global: "Global",
        us: "US",
        uk: "UK",
        ca: "CA",
        au: "AU",
        unknown: "unknown",
      };
      market = country[market.toLowerCase()] || "unknown";
      const rawDefinition = get("definition");
      const kinds: Record<string, string> = {
        monthly: "monthly",
        aylik: "monthly",
        rolling12: "rolling12",
        "12 month average": "rolling12",
        unknown: "unknown",
      };
      const definition = rawDefinition
        ? kinds[normal(rawDefinition)] || "unknown"
        : settings.definition;
      const period = get("period") || settings.period,
        observedAt = get("observedAt") || settings.observedAt;
      if (
        period &&
        (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ||
          period > researchToday().slice(0, 7))
      )
        throw Error("Dönem YYYY-AA olmalı; gelecek dönem kabul edilmez.");
      if (observedAt && !validDate(observedAt))
        throw Error("Kontrol tarihi YYYY-AA-GG olmalı ve gelecekte olmamalı.");
      if (definition !== "unknown" && !period)
        throw Error("Aylık / 12 aylık ortalama için dönem (YYYY-AA) gerekli.");
      const metrics = Object.fromEntries(
        metricKeys.map((k) => [k, csvMetric(get(k), settings.numberFormat)]),
      ) as Metrics;
      if (metricKeys.every((k) => metrics[k].kind === "missing"))
        throw Error("Bütün metrikler boş/bilinmiyor.");
      const r = {
        row,
        term,
        market,
        platform: settings.platform,
        source: settings.source,
        definition,
        period,
        observedAt,
        metrics,
      };
      const id = hash({ ...r, row: 0 });
      if (seen.has(id)) {
        duplicates++;
        continue;
      }
      seen.add(id);
      records.push(r);
    } catch (e) {
      errors.push({
        row,
        error: e instanceof Error ? e.message : "Satır okunamadı.",
      });
    }
  }
  return {
    ...table,
    mapping,
    records,
    errors,
    total: table.rows.length,
    duplicates,
  };
}
export function observationIdentity(r: CsvRecord) {
  return hash({ ...r, row: 0 });
}
export function comparableKey(r: CsvRecord) {
  return [r.term, r.market, r.platform, r.source, r.definition].join("|");
}
export function periodIndex(s: string) {
  const [y, m] = s.split("-").map(Number);
  return y * 12 + m - 1;
}
