export type AnalysisProvider = "local" | "claude";
export const localVisionModel = "qwen3-vl:4b-instruct";
export function selectAnalysisProvider(value: unknown, consent: unknown) {
  const provider =
    value === undefined || value === null || value === "" ? "local" : value;
  if (provider !== "local" && provider !== "claude")
    throw Error("Geçersiz analiz seçimi.");
  const claudeConsent =
    consent === true || consent === "true" || consent === "on";
  if (provider === "claude" && !claudeConsent)
    throw Error("Claude yalnız açık onayınla kullanılabilir.");
  return {
    provider: provider as AnalysisProvider,
    claudeConsent: provider === "claude" && claudeConsent,
  };
}
export function assertClaudeConsent(input: {
  provider?: unknown;
  claudeConsent?: unknown;
}) {
  if (input.provider !== "claude" || input.claudeConsent !== true)
    throw Error("Claude için açık izin yok; dış model çağrısı yapılmadı.");
}
export const workerId = (provider: AnalysisProvider) =>
  provider === "local" ? "local-ai" : "local-claude";
