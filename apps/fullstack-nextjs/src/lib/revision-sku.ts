export const revisionCategories = [
  { code: "BT", name: "botanik / çiçek" },
  { code: "GE", name: "geometrik" },
  { code: "SY", name: "soyut / organik" },
  { code: "AD", name: "art deco" },
  { code: "CH", name: "chinoiserie" },
  { code: "TO", name: "toile / resimli sahne" },
  { code: "CZ", name: "çizgi / scallop" },
  { code: "MZ", name: "manzara / orman" },
  { code: "SH", name: "sahil / denizci" },
  { code: "DK", name: "doku taklidi" },
  { code: "LW", name: "düz renk / limewash" },
  { code: "JP", name: "modern minimal / japandi" },
  { code: "MC", name: "mid-century" },
  { code: "RT", name: "retro 70'ler" },
  { code: "VK", name: "vintage klasik / viktorya" },
  { code: "RS", name: "rustik / çiftlik evi" },
  { code: "MK", name: "maksimalist / tropikal" },
  { code: "BB", name: "bebek odası" },
  { code: "CO", name: "çocuk odası" },
  { code: "GN", name: "genç odası" },
  { code: "ME", name: "mekanlar (kafe, mağaza, klinik)" },
  { code: "CB", name: "ofis / cubicle" },
];
export function revisionCode(category: string, number: number) {
  if (
    !revisionCategories.some((c) => c.code === category) ||
    !Number.isSafeInteger(number) ||
    number < 1
  )
    throw Error("Kategori veya sıra numarası geçersiz.");
  return `${category}-${String(number).padStart(4, "0")}-D`;
}
export function highestCategorySequence(category: string, codes: string[]) {
  const pattern = new RegExp(`^${category}-(\\d+)(?:-[A-Z0-9]+)*$`);
  return Math.max(
    0,
    ...codes
      .map((code) => {
        const match = pattern.exec(code);
        return match ? Number(match[1]) : 0;
      })
      .filter(Number.isSafeInteger),
  );
}
