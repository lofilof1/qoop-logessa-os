export function pageNumber(value: unknown) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export function shouldPollAnalysis(active: boolean, state: string | undefined) {
  return active && (!state || state === "PENDING" || state === "RUNNING");
}
export function sameKeywordColumns(a: unknown, b: unknown) {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const sort = (x: object) =>
    JSON.stringify(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)));
  return sort(a) === sort(b);
}
