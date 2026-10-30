import { beforeEach, it, expect, vi } from "vitest";
import { revisionCode, highestCategorySequence } from "../src/lib/revision-sku";
const m = vi.hoisted(() => ({
  existing: null as any,
  currentJob: "job1",
  jobState: "SUCCEEDED",
  created: vi.fn(),
  allocated: vi.fn(),
  saved: vi.fn(),
  lock: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (fn: any) =>
      fn({
        $executeRaw: m.lock,
        analysisPromptApproval: {
          findUnique: async () => m.existing,
          create: async ({ data }: any) => {
            m.saved(data);
            m.existing = { ...data, id: "approval1" };
            return m.existing;
          },
        },
        imageAnalysis: {
          findUnique: async () => ({
            id: "analysis1",
            reviewJobId: m.currentJob,
            title: "Test mural",
            mode: "mural",
            width: 1200,
            height: 900,
            wallWidth: 400,
            wallHeight: 300,
            sha256: "abc",
            key: "source.png",
            notes: "",
            report: "",
          }),
        },
        analysisReviewJob: {
          findUnique: async () => ({
            id: "job1",
            state: m.jobState,
            result: {
              imageRead: true,
              summary: "Özet",
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
                evidence: "Kanıt",
                recommendation: "Öneri",
                confidence: "high",
                lessonPages: [12],
              })),
              strengths: ["Renk"],
              preserve: ["Sahne"],
              priorities: Array.from({ length: 3 }, () => ({
                issue: "Sorun",
                action: "Eylem",
                tool: "Araç",
              })),
              correctedPrompt:
                "Flat painted scenic landscape mural with trees and a lake. Preserve water reflections.",
              negativePrompt: "text, frame",
              limits: ["No print validation"],
            },
          }),
        },
        revisionSkuSequence: {
          upsert: async () => ({ lastNumber: 2 }),
          update: m.allocated,
        },
        design: {
          findMany: async () => [{ code: "MZ-0012" }],
          create: async ({ data }: any) => {
            m.created(data);
            return { id: "design1" };
          },
        },
        sku: { findMany: async () => [{ code: "MZ-0008-D" }] },
      }),
  },
}));
import { POST } from "../src/app/api/analysis/[id]/approve/route";
const request = (body: Record<string, unknown> = {}) =>
  new Request("http://localhost:3000/api/analysis/analysis1/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      Host: "localhost:3000",
    },
    body: JSON.stringify({
      approved: true,
      category: "MZ",
      provider: "MIDJOURNEY",
      jobId: "job1",
      ...body,
    }),
  });
const context = { params: Promise.resolve({ id: "analysis1" }) };
beforeEach(() => {
  m.existing = null;
  m.currentJob = "job1";
  m.jobState = "SUCCEEDED";
  vi.clearAllMocks();
});
it("keeps existing family codes and finds the highest legacy ordinal", () => {
  expect(revisionCode("MZ", 1)).toBe("MZ-0001-D");
  expect(revisionCode("BT", 10001)).toBe("BT-10001-D");
  expect(
    highestCategorySequence("MZ", [
      "MZ-012",
      "MZ-0042-D",
      "MZ-002-V1",
      "MZ-odd",
      "BT-9000",
    ]),
  ).toBe(42);
  expect(() => revisionCode("XX", 1)).toThrow();
});
it("requires explicit approval and a supported category", async () => {
  expect((await POST(request({ approved: false }), context)).status).toBe(400);
  expect((await POST(request({ category: "XX" }), context)).status).toBe(400);
  expect(m.created).not.toHaveBeenCalled();
});
it("saves the immutable approved report, both provider prompts and one waiting-image SKU", async () => {
  const r = await (await POST(request(), context)).json();
  expect(r.code).toBe("MZ-0013-D");
  expect(m.lock).toHaveBeenCalledOnce();
  const data = m.created.mock.calls[0][0];
  expect(data.skus.create.code).toBe(r.code);
  expect(data.sources.create.raw.produced).toBe(false);
  expect(data.sources.create.raw.prompts.chatgpt).toContain("lake");
  expect(data.sources.create.raw.prompts.midjourney).toContain("--ar 4:3");
  expect(data.sources.create.raw.sourceImageHash).toBe("abc");
  expect(data.sources.create.provider).toBe("MIDJOURNEY");
  expect((await (await POST(request(), context)).json()).reused).toBe(true);
  expect(m.created).toHaveBeenCalledOnce();
  expect(m.allocated).toHaveBeenCalledOnce();
});
it("does not approve stale or unfinished reviews", async () => {
  m.currentJob = "job2";
  expect((await POST(request(), context)).status).toBe(400);
  m.currentJob = "job1";
  m.jobState = "PENDING";
  expect((await POST(request(), context)).status).toBe(400);
  expect(m.created).not.toHaveBeenCalled();
});
