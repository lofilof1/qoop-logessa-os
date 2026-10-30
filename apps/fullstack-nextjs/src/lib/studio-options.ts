import catalog from "../../data/lessons/catalog.json";
import market from "../../data/lessons/market-options.json";
export type PersonalOption = { fieldId: string; value: string };
export const marketOptions = market;
export function fieldOptions(fieldId: string, personal: PersonalOption[] = []) {
  const base = catalog.fields.find((f) => f.id === fieldId)?.options || [];
  const additions =
    (market.fields as Record<string, { value: string }[]>)[fieldId] || [];
  const seen = new Set<string>();
  return [
    ...base,
    ...additions.map((x) => x.value),
    ...personal.filter((x) => x.fieldId === fieldId).map((x) => x.value),
  ].filter((v) => {
    const k = normalizeOption(v);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
export function normalizeOption(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}
