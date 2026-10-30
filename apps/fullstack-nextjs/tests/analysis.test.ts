import { beforeEach, describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { analysisInput, resolution, reviewPrompt } from "../src/lib/analysis";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  send: vi.fn(),
  duplicate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { imageAnalysis: { create: mocks.create, findFirst: mocks.duplicate } },
}));
vi.mock("@/lib/storage", () => ({
  s3: { send: mocks.send },
  bucket: () => "test",
}));
import { POST } from "../src/app/api/analysis/route";
function request(body: Buffer, name: string) {
  const form = new FormData();
  form.set("title", "Görsel testi");
  form.set("mode", "pattern");
  form.set("focus", "Renk");
  form.set("notes", "");
  form.set("file", new File([new Uint8Array(body)], name));
  return new Request("http://localhost:3000/api/analysis", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    body: form,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.duplicate.mockResolvedValue(null);
  mocks.send.mockResolvedValue({});
  mocks.create.mockResolvedValue({ id: "test1" });
});
describe("image analysis intake", () => {
  it("computes actual PPI from pixels and cm, without using DPI metadata", () => {
    expect(resolution(3600, 2700, 400, 300)).toEqual({
      ratio: 1.333,
      ppiX: 22.9,
      ppiY: 22.9,
    });
    expect(resolution(1200, 800, null, null).ppiX).toBeNull();
  });
  it("allows absent physical measurements and rejects invalid ones", () => {
    const d = {
      title: "Test",
      mode: "auto",
      focus: "",
      notes: "",
      wallWidth: "",
      wallHeight: "",
    };
    expect(analysisInput.parse(d).wallWidth).toBeNull();
    expect(analysisInput.safeParse({ ...d, wallWidth: "abc" }).success).toBe(
      false,
    );
  });
  it("archives JPEG original and a readable PNG preview", async () => {
    const image = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    const r = await POST(request(image, "test.jpg"));
    expect(r.status).toBe(201);
    const data = mocks.create.mock.calls[0][0].data;
    expect(data.width).toBe(32);
    expect(data.height).toBe(24);
    expect(data.mime).toBe("image/jpeg");
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[1][0].input.ContentType).toBe("image/png");
  });
  it("rejects broken images before storing anything", async () => {
    const r = await POST(request(Buffer.from("not an image"), "fake.png"));
    expect(r.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("removes uploaded objects if database archiving fails", async () => {
    mocks.create.mockRejectedValueOnce(Error("db failure"));
    const image = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    expect((await POST(request(image, "test.png"))).status).toBe(400);
    expect(mocks.send).toHaveBeenCalledTimes(4);
  });
  it("requires a real image alongside the review request", () => {
    const p = reviewPrompt({
      mode: "mural",
      focus: "Renk",
      notes: "Ağacı koru",
      width: 1000,
      height: 500,
      wallWidth: null,
      wallHeight: null,
    });
    expect(p).toContain("Ağacı koru");
    expect(p).toContain("Görsel ekli değilse değerlendirme yapma");
  });
});

it("reuses the same image and criteria without storage or a new model job", async () => {
  mocks.duplicate.mockResolvedValue({
    id: "existing",
    reviewJobId: "completed",
  });
  const r = await POST(request(Buffer.from("existing-image"), "x.png"));
  expect((await r.json()).reused).toBe(true);
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
