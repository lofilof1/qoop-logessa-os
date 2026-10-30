import { it, expect, vi, beforeEach } from "vitest";
import { initialBrief } from "../src/lib/studio";
const m = vi.hoisted(() => ({ jobs: new Map<string, any>(), design: vi.fn() }));
vi.mock("@/lib/db", () => {
  const jobs = {
    findUnique: async ({ where }: any) => m.jobs.get(where.requestHash) || null,
    create: async ({ data }: any) => {
      m.jobs.set(data.requestHash, data);
      return data;
    },
  };
  return {
    db: {
      studioGeneration: jobs,
      design: {
        findUniqueOrThrow: async () => ({
          id: "design-confirmed",
          code: "TEST-QOOP-001",
        }),
      },
      $transaction: async (fn: any) =>
        fn({ studioGeneration: jobs, design: { create: m.design } }),
    },
  };
});
import { POST } from "../src/app/api/studio/confirm/route";
const req = (produced: boolean) =>
  new Request("http://localhost:3000/api/studio/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      Host: "localhost:3000",
    },
    body: JSON.stringify({
      brief: initialBrief(),
      provider: "MIDJOURNEY",
      sku: "TEST-QOOP-001",
      produced,
    }),
  });
beforeEach(() => {
  m.jobs.clear();
  m.design.mockReset();
  m.design.mockResolvedValue({ id: "design-confirmed", code: "TEST-QOOP-001" });
});
it("does not create any design or SKU before produced is explicitly checked", async () => {
  expect((await POST(req(false))).status).toBe(400);
  expect(m.design).not.toHaveBeenCalled();
});
it("atomically archives SKU, both prompts and criteria only once", async () => {
  const a = await (await POST(req(true))).json();
  expect(a.code).toBe("TEST-QOOP-001");
  const data = m.design.mock.calls[0][0].data;
  expect(data.skus.create.code).toBe(a.code);
  expect(data.sources.create.provider).toBe("MIDJOURNEY");
  expect(data.sources.create.raw.brief).toBeDefined();
  expect(data.sources.create.raw.prompts.chatgpt).toBeDefined();
  expect((await (await POST(req(true))).json()).reused).toBe(true);
  expect(m.design).toHaveBeenCalledOnce();
});
