import { it, expect } from "vitest";
import {
  importedKeywords,
  parseCsv,
  selectListingKeywords,
  parseListing,
} from "../src/lib/listing";
it("imports quoted multiline eRank CSV, preserves metrics, and deduplicates terms", () => {
  const rows = importedKeywords(
    'Keyword,Competition,Notes\r\n"Green, gold mural",123,"line one\nline two"\r\n"Green, gold mural",200,x\r\nBotanical mural,250,y',
  );
  expect(rows).toHaveLength(2);
  expect(rows[0].term).toBe("green, gold mural");
  expect(rows[0].data.columns.competition).toBe("123");
  expect(rows[0].data.columns.notes).toContain("\n");
});
it("accepts semicolon exports without splitting decimal commas", () => {
  expect(parseCsv("Keyword;Score\nforest mural;1,25")[1]).toEqual([
    "forest mural",
    "1,25",
  ]);
  expect(() => importedKeywords("Unknown,Searches\nx,2")).toThrow();
});
it("bounds retrieval and strips large raw evidence while preserving source dates", () => {
  const rows = Array.from({ length: 300 }, (_, i) => ({
    term: i === 200 ? "green architecture mural" : `botanical ${i}`,
    category: String(i % 5),
    data: {
      observedAt: "2026-10-23",
      aylik_arama: "10",
      raw: "x".repeat(2000),
    },
  }));
  const k = selectListingKeywords(rows, "green architecture");
  expect(k).toHaveLength(60);
  expect(k[0].term).toBe("green architecture mural");
  expect(k[0].sourceDate).toBe("2026-10-23");
  expect(JSON.stringify(k)).not.toContain("raw");
});
it("rejects duplicate or oversized tags before publishing a result", () => {
  const base = {
    imageRead: true,
    visualSummary: "Green architectural scene",
    title: "Green architectural wallpaper mural",
    tags: Array(13).fill("green mural"),
    description: "An original architectural wallpaper scene in green and gold.",
    rationale: "Image evidence",
    warnings: [],
  };
  expect(() => parseListing(JSON.stringify(base))).toThrow();
  const tags = Array.from({ length: 13 }, (_, i) => `mural ${i}`);
  expect(parseListing(JSON.stringify({ ...base, tags })).tags).toHaveLength(13);
  expect(() =>
    parseListing(
      JSON.stringify({ ...base, tags: ["x".repeat(21), ...tags.slice(1)] }),
    ),
  ).toThrow();
});
