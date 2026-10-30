import {midjourneyArtwork,midjourneyPresentation} from "./midjourney-artwork";
import { gridDirection } from "./seam-grid";
import {
  continuityDirection,
  type ContinuityContext,
} from "./prompt-continuity";
import { productionPrompt } from "./studio-production";
import { selected, type StudioData } from "./studio";
export function aspectParameter(value: string) {
  const values = value.split(":").map(Number);
  if (values.length !== 2 || values.some((n) => !Number.isFinite(n) || n <= 0))
    throw Error("Geçerli bir en/boy oranı seç.");
  const a = Math.round(values[0] * 1000),
    b = Math.round(values[1] * 1000);
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 1 || b < 1)
    throw Error("Bu en/boy oranı desteklenmiyor.");
  const g = gcd(a, b);
  return `${a / g}:${b / g}`;
}
// Same visual intent, distinct provider syntax. No extra model call per selection.
export function providerPrompts(
  core: string,
  negative = "text, signature, watermark, mockup, frame, border, photograph, 3D, fine grain, speckles, paper texture",
  aspect?: string,
  tile = false,
  context: ContinuityContext = {},
) {
  const clean = core.replace(/\bQoop\b/gi,"LOGESSA").replace(/--[a-z][\w-]*(?:\s+[^\n]*)?/gi, "").trim();
  if (tile) aspect = "1:1";
  const continuity = continuityDirection(tile, context);
  const size =
    tile && !/1000\s*[x×]\s*1000/.test(clean)
      ? "Final tile target: exactly 1000 x 1000 pixels, square 1:1."
      : "";
  const coordinate =
    tile && !clean.includes("Invisible coordinate construction plan")
      ? gridDirection()
      : "";
  const directions = [size, continuity, coordinate].filter(Boolean).join(" ");
  const mjCore = clean
    .split(/\n+/)
    .filter(
      (line) =>
        !line.startsWith("Generate an original") &&
        !line.startsWith("Physical measurements") &&
        !line.startsWith("Exclude any text"),
    )
    .join(". ");
  const exclusions = negative.replace(/--/g, "").replace(/[\n\r]+/g, ", ");
  return {
    chatgpt: `Create the artwork described below. Follow the motif hierarchy, palette and composition consistently.\n\n${clean}${directions ? `\n\n${directions}` : ""}\n\nAvoid: ${exclusions}.${aspect ? `\nTarget aspect ratio: ${aspect}. Recompose for this ratio; do not stretch the artwork.` : ""}${tile ? "\nMake opposing edges connect as a four-edge repeat tile. This is a generation target; edge continuity must be checked afterward." : ""}`,
    midjourney: `${midjourneyPresentation(tile)} ${midjourneyArtwork(`${mjCore}${directions ? `. ${directions}` : ""}`,tile)} --no ${[...new Set([...exclusions.split(",").map(s=>s.trim()).filter(Boolean),"mockup","showroom","frame","matting"])].join(", ")}${aspect ? ` --ar ${aspectParameter(aspect)}` : ""} --raw${tile ? " --tile" : ""}`,
  };
}
export function studioPrompts(d: StudioData) {
  return providerPrompts(
    productionPrompt(d),
    undefined,
    selected(d, "aspect"),
    d.mode === "pattern",
    { mode: d.mode, repeat: selected(d, "repeat") },
  );
}

export function reviewProviderPrompts(
  core: string,
  negative: string,
  aspect: string,
  mode: string,
) {
  let resolved: ContinuityContext["mode"] = [
    "pattern",
    "mural",
    "continuous",
    "motif",
    "edit",
  ].includes(mode)
    ? (mode as ContinuityContext["mode"])
    : undefined;
  if (!resolved) {
    if (
      /recommended target:\s*(?:continuous|seamless mural)|continuous scenic mural/i.test(
        core,
      )
    )
      resolved = "continuous";
    else if (/recommended target:\s*mural/i.test(core)) resolved = "mural";
    else if (/seamless.*(?:tile|repeat)|four.edge/i.test(core))
      resolved = "pattern";
  }
  return providerPrompts(core, negative, aspect, resolved === "pattern", {
    mode: resolved,
    repeat: /half[- ]drop/i.test(core)
      ? "Half-drop"
      : /\bbrick\b/i.test(core)
        ? "Brick"
        : "Straight",
  });
}
