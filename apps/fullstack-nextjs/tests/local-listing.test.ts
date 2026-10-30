import { it, expect } from "vitest";
import { buildLocalListing, rankLocalKeywords } from "../src/lib/local-listing";
const input = {
  subject: "arched village",
  color: "yeşil ve altın",
  style: "yağlıboya",
  product: "wall mural" as const,
  notes: "",
  material: "",
};
const rows = [
  {
    term: "green gold mural",
    category: "color",
    data: { aylik_arama: "100", rakip_ilan: "500" },
  },
  {
    term: "green botanical mural",
    category: "motif",
    data: { aylik_arama: "99999" },
  },
  { term: "peel and stick mural", category: "material", data: {} },
  { term: "village wall mural", category: "motif", data: {} },
];
it("uses only compatible evidence and never high-volume unrelated motifs or unconfirmed claims", () => {
  const k = rankLocalKeywords(rows, input).map((k) => k.term);
  expect(k).toContain("green gold mural");
  expect(k).toContain("village wall mural");
  expect(k).not.toContain("green botanical mural");
  expect(k).not.toContain("peel and stick mural");
});
it("creates a deterministic valid local draft without claiming to have read the image", () => {
  const a = buildLocalListing(input, rows);
  expect(a.result).toEqual(buildLocalListing(input, rows).result);
  expect(a.result.imageRead).toBe(false);
  expect(a.result.tags).toHaveLength(13);
  expect(new Set(a.result.tags).size).toBe(13);
  expect(a.result.tags.every((t) => t.length <= 20)).toBe(true);
  expect(a.result.title).toContain("Wall Mural");
  expect(a.result.description).not.toContain("peel and stick");
  expect(a.result.description).toContain("green and gold");
});
it("allows empty data without claiming research evidence, and reflects future uploads", () => {
  const empty = buildLocalListing(input, []);
  expect(empty.evidence).toHaveLength(0);
  expect(empty.result.warnings.some((w) => w.includes("0 tag"))).toBe(true);
  expect(buildLocalListing(input, rows).evidence.length).toBeGreaterThan(0);
  expect(() => buildLocalListing({ ...input, subject: "" }, rows)).toThrow();
});

it("does not label a pattern listing as a mural",()=>{const r=buildLocalListing({...input,subject:"floral",product:"wallpaper"},[]).result;expect(r.tags.some(t=>t.includes("mural"))).toBe(false);});
