import { it, expect } from "vitest";
import { composeStudio } from "../src/lib/studio-composer";
import {
  initialBrief,
  chooseStudioValue,
  changeStudioField,
  selected,
  briefSchema,
} from "../src/lib/studio";
import { studioPrompts } from "../src/lib/provider-prompts";
it("manual vector replaces watercolor immediately and survives repeated composition", () => {
  let d = composeStudio(initialBrief());
  expect(selected(d, "medium")).toBe("Suluboya");
  d = chooseStudioValue(d, "medium", "Vektör");
  for (let i = 0; i < 3; i++) {
    const p = studioPrompts(d);
    for (const text of [p.chatgpt, p.midjourney]) {
      expect(text).toContain("Sanatsal teknik: Vektör");
      expect(text).not.toContain("Sanatsal teknik: Suluboya");
      expect(text).not.toContain(
        "Tasarım tarzı: Original flat painted illustration",
      );
      expect(text).toContain("flat vector-style");
    }
    d = composeStudio(d);
    expect(selected(d, "medium")).toBe("Vektör");
  }
});
it("switching back from vector does not retain the automatic vector style", () => {
  let d = composeStudio(chooseStudioValue(initialBrief(), "medium", "Vektör"));
  d = chooseStudioValue(d, "medium", "Suluboya");
  const p = studioPrompts(d);
  expect(p.chatgpt).toContain("Sanatsal teknik: Suluboya");
  expect(p.chatgpt).not.toContain("Tasarım tarzı: Flat vector illustration");
});
it("all explicit field changes and numeric targets outrank automatic defaults", () => {
  let d = composeStudio({ ...initialBrief(), mode: "mural" });
  d = chooseStudioValue(d, "palette", "Toprak tonları");
  d = chooseStudioValue(d, "secondary", "Ördek");
  d = chooseStudioValue(d, "contrast", "Yüksek");
  d = changeStudioField(d, "density", 55);
  const next = composeStudio(d);
  expect(selected(next, "palette")).toBe("Toprak tonları");
  expect(selected(next, "secondary")).toBe("Ördek");
  expect(selected(next, "contrast")).toBe("Yüksek");
  expect(next.density).toBe(55);
  expect(briefSchema.safeParse(next).success).toBe(true);
});
it("restores manual custom choices after reload, and recognizes edits in older drafts without manual markers", () => {
  let d = composeStudio(initialBrief());
  d.values.medium = "Vektör";
  expect(selected(composeStudio(d), "medium")).toBe("Vektör");
  d = chooseStudioValue(d, "palette", "__other__");
  d = changeStudioField(d, "custom", { ...d.custom, palette: "Indigo / rust" });
  const restored = briefSchema.parse(JSON.parse(JSON.stringify(d)));
  expect(selected(composeStudio(restored), "palette")).toBe("Indigo / rust");
});
