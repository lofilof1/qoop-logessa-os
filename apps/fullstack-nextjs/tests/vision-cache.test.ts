import { it, expect, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const spawn = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn }));
import { runVision } from "../scripts/vision-cli";
it("recovers a schema-valid cached response without calling the model again", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "qoop-vision-cache-"));
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
  try {
    const dir = path.join(root, ".runtime", "analysis-response-cache");
    await mkdir(dir, { recursive: true });
    const key = "a".repeat(64);
    const result = {
      imageRead: true,
      summary: "Önbellek raporu",
      criteria: [
        "density",
        "palette",
        "composition",
        "hierarchy",
        "style",
        "technical",
      ].map((criterion) => ({
        criterion,
        observation: "Gözlem",
        evidence: "Görünen motif",
        recommendation: "Düzeltme",
        confidence: "medium",
        lessonPages: [12],
      })),
      strengths: ["Renk"],
      preserve: ["Motif"],
      priorities: [1, 2, 3].map(() => ({
        issue: "Sorun",
        action: "Düzelt",
        tool: "Guaj",
      })),
      correctedPrompt:
        "A cohesive painted wallpaper mural preserving the original motif family and calm palette.",
      negativePrompt: "No text",
      limits: Array(8).fill("Ek teknik kontrol gereklidir."),
    };
    await writeFile(
      path.join(dir, key + ".json"),
      JSON.stringify({
        text: JSON.stringify(result),
        usage: { output_tokens: 1 },
      }),
    );
    const out = await runVision(
      Buffer.from("unused"),
      "unused",
      key,
      "prompt",
      undefined,
      true,
    );
    expect(out.result.limits.length).toBe(8);
    expect(spawn).not.toHaveBeenCalled();
  } finally {
    cwd.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});
