import { describe, it, expect } from "vitest";
import {
  reviewInput,
  reviewInstruction,
  parseReview,
  reviewResultSchema,
} from "../src/lib/analysis-review";
const image = {
  id: "one",
  sha256: "image-sha",
  previewKey: "preview1",
  mode: "pattern",
  focus: "Genel inceleme",
  notes: "Renkleri koru",
  width: 1376,
  height: 768,
  wallWidth: null,
  wallHeight: null,
};
const result = {
  imageRead: true,
  summary: "Rapor",
  criteria: [
    "density",
    "palette",
    "composition",
    "hierarchy",
    "style",
    "technical",
  ].map((criterion) => ({
    criterion,
    observation: "Görsel yorum",
    evidence: "Görünen evler",
    recommendation: "Düzeltme",
    confidence: "medium",
    lessonPages: [12],
  })),
  strengths: ["Sakin palet"],
  preserve: ["Ana motif"],
  priorities: [1, 2, 3].map(() => ({
    issue: "Sorun",
    action: "Düzelt",
    tool: "Yeniden üretim",
  })),
  correctedPrompt:
    "A coherent flat painted mural with quiet open areas, preserving the original motif family.",
  negativePrompt: "No text",
  limits: ["Baskı onayı değildir"],
};
describe("lesson based visual review", () => {
  it("reuses identical content despite a new upload ID and preview path", () => {
    expect(reviewInput(image).requestHash).toBe(
      reviewInput({ ...image, id: "two", previewKey: "preview2" }).requestHash,
    );
  });
  it("invalidates cache when image, physical scale or instructions change", () => {
    for (const changed of [
      { sha256: "new" },
      { wallWidth: 400 },
      { notes: "Yoğunluğu azalt" },
      { mode: "mural" },
    ])
      expect(reviewInput({ ...image, ...changed }).requestHash).not.toBe(
        reviewInput(image).requestHash,
      );
  });
  it("retrieves only four relevant lesson pages", () => {
    const { input } = reviewInput(image);
    expect(input.lessonEvidence.map((x) => x.page)).toEqual([12, 19, 28, 34]);
    expect(
      reviewInput({ ...image, mode: "mural" }).input.lessonEvidence.map(
        (x) => x.page,
      ),
    ).toEqual([12, 36, 28, 34]);
    expect(reviewInstruction(input)).toContain("görsel tahmin");
  });
  it("requires all six distinct criteria, three corrections and actual image reading", () => {
    expect(reviewResultSchema.safeParse(result).success).toBe(true);
    expect(
      reviewResultSchema.safeParse({ ...result, imageRead: false }).success,
    ).toBe(false);
    expect(
      reviewResultSchema.safeParse({
        ...result,
        criteria: [...result.criteria.slice(0, 5), result.criteria[0]],
      }).success,
    ).toBe(false);
    expect(
      reviewResultSchema.safeParse({ ...result, priorities: [] }).success,
    ).toBe(false);
  });
  it("parses valid model JSON but never accepts a plain or fabricated completion", () => {
    expect(
      parseReview("```json\n" + JSON.stringify(result) + "\n```")
        .correctedPrompt,
    ).toContain("mural");
    expect(() => parseReview('{"error":"IMAGE_NOT_READ"}')).toThrow();
    expect(() => parseReview("Analiz tamamlandı")).toThrow();
  });
});
