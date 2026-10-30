import { describe, it, expect, vi } from "vitest";
import {
  selectAnalysisProvider,
  assertClaudeConsent,
} from "../src/lib/analysis-engine";
import { runVision } from "../scripts/vision-cli";
describe("Claude yalnız açık izinle", () => {
  it("seçim yapılmazsa her zaman yerel modu seçer", () => {
    expect(selectAnalysisProvider(undefined, false)).toEqual({
      provider: "local",
      claudeConsent: false,
    });
    expect(selectAnalysisProvider(null, "true")).toEqual({
      provider: "local",
      claudeConsent: false,
    });
  });
  it("sağlayıcı seçmek tek başına dış modele izin değildir", () => {
    expect(() => selectAnalysisProvider("claude", false)).toThrow(/onayın/);
    expect(() => selectAnalysisProvider("local", "true")).not.toThrow();
  });
  it("açık onayı yalnız Claude seçildiğinde kaydeder", () => {
    expect(selectAnalysisProvider("claude", "true")).toEqual({
      provider: "claude",
      claudeConsent: true,
    });
    expect(() => assertClaudeConsent({ provider: "claude" })).toThrow();
    expect(() =>
      assertClaudeConsent({ provider: "local", claudeConsent: true }),
    ).toThrow();
    expect(() =>
      assertClaudeConsent({ provider: "claude", claudeConsent: true }),
    ).not.toThrow();
  });
  it("CLI adaptörü önbellek olsa bile izinsiz çalışmaz", async () => {
    await expect(runVision(null, "unused", "a".repeat(64))).rejects.toThrow(
      /açık izin/,
    );
  });
  it("bilinmeyen sağlayıcıyı kabul etmez", () => {
    expect(() => selectAnalysisProvider("external", true)).toThrow();
  });
});

import { localTagPool, chooseLocalTags } from "../src/lib/local-listing-tags";
import { localEndpoint } from "../scripts/local-vision";
it("yerel sağlayıcı uzak sunucuya yönlendirilemez", () => {
  vi.stubEnv("OLLAMA_ENDPOINT", "https://cloud.example.com");
  expect(() => localEndpoint()).toThrow(/bu Mac/);
  vi.unstubAllEnvs();
});
it("yerel etiket seçimi bozuk dili, sahte seamless iddiasını ve tekrarı ayıklar", () => {
  const v = {
    imageRead: true as const,
    summary: "Genuine local reading",
    subject: "Art Deco fans",
    motifs: ["fans"],
    colors: ["teal", "gold"],
    styles: ["art deco"],
    searchTerms: ["art deco wallpaper", "fan wallpaper"],
    rooms: ["bedroom"],
    product: "wallpaper" as const,
    imageKind: "artwork" as const,
    uncertainties: [],
  };
  const pool = localTagPool(v, []);
  const tags = chooseLocalTags(
    [
      "Wallpaper with fan形状",
      "seamless wallpaper",
      "art deco wallpaper",
      "art deco wallpaper",
    ],
    pool,
  );
  expect(tags).toHaveLength(13);
  expect(new Set(tags).size).toBe(13);
  expect(
    tags.every((t) => t.length <= 20 && /^[a-z0-9][a-z0-9 '\-]*$/.test(t)),
  ).toBe(true);
  expect(tags).not.toContain("seamless wallpaper");
  expect(tags).toContain("art deco wallpaper");
});
