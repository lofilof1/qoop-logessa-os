import { beforeEach, describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { initialBrief } from "../src/lib/studio";
import { generationSize, productionPrompt } from "../src/lib/studio-production";
const mocks = vi.hoisted(() => ({
  rows: new Map<string, any>(),
  key: vi.fn(),
  send: vi.fn(),
  design: vi.fn(),
}));
vi.mock("@/lib/image-connection", async () => {
  const actual = await vi.importActual<any>("@/lib/image-connection");
  return { ...actual, imageKey: mocks.key };
});
vi.mock("@/lib/storage", () => ({
  s3: { send: mocks.send },
  bucket: () => "test",
}));
vi.mock("@/lib/db", () => {
  const jobs = {
    findUnique: vi.fn(
      async ({ where }: any) => mocks.rows.get(where.requestHash) || null,
    ),
    create: vi.fn(async ({ data }: any) => {
      const row = {
        ...data,
        id: "job1",
        status: "RUNNING",
        createdAt: new Date(),
        designId: null,
        assetId: null,
        error: null,
      };
      mocks.rows.set(data.requestHash, row);
      return row;
    }),
    update: vi.fn(async ({ data }: any) => {
      const row = [...mocks.rows.values()][0];
      Object.assign(row, data);
      return row;
    }),
  };
  return {
    db: {
      studioGeneration: jobs,
      $transaction: async (fn: any) =>
        fn({ studioGeneration: jobs, design: { create: mocks.design } }),
    },
  };
});
import { POST } from "../src/app/api/studio/generate/route";
const request = () =>
  new Request("http://localhost:3000/api/studio/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      Host: "localhost:3000",
    },
    body: JSON.stringify({
      brief: initialBrief(),
      variant: "00000000-0000-4000-8000-000000000000",
    }),
  });
beforeEach(() => {
  mocks.rows.clear();
  vi.clearAllMocks();
  mocks.key.mockResolvedValue("fake-key-not-a-real-secret");
  mocks.send.mockResolvedValue({});
  mocks.design.mockResolvedValue({ id: "design1", assets: [{ id: "asset1" }] });
});
describe("studio production", () => {
  it("preserves selected ratio and custom motifs in the prompt", () => {
    const d = initialBrief();
    d.mode = "mural";
    d.values.aspect = "4:3";
    d.values.primary = "__other__";
    d.custom.primary = "Manolya";
    expect(generationSize(d)).toBe("1536x1152");
    expect(productionPrompt(d)).toContain("Manolya");
    d.values.aspect = "16:9";
    expect(generationSize(d)).toBe("1536x864");
  });
  it("does not contact provider without a key", async () => {
    mocks.key.mockResolvedValue("");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("archives one generated PNG and reuses duplicate requests", async () => {
    const png = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: [{ b64_json: png.toString("base64") }],
        usage: { total_tokens: 42 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const first = await (await POST(request())).json();
    expect(first.status).toBe("SUCCEEDED");
    expect(first.designId).toBe("design1");
    expect(mocks.send).toHaveBeenCalledOnce();
    const archived = await sharp(
      mocks.send.mock.calls[0][0].input.Body,
    ).metadata();
    expect([archived.width, archived.height]).toEqual([1000, 1000]);
    const second = await (await POST(request())).json();
    expect(second.reused).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not retry uncertain paid requests", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(502);
    expect((await (await POST(request())).json()).status).toBe("UNCERTAIN");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("keeps quota errors actionable without automatic retry", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("secret provider body", { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await (await POST(request())).json();
    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("kota");
    expect(result.error).not.toContain("secret");
    expect(mocks.design).not.toHaveBeenCalled();
  });
  it("blocks cross-origin mutations before any paid call", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const r = request();
    r.headers.set("origin", "https://elsewhere.example");
    expect((await POST(r)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
