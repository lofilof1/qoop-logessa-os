vi.mock("../src/lib/variant-record",()=>({ensureVariantName:vi.fn().mockResolvedValue("Forest · Vector")}));
import { beforeEach, describe, it, expect, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  duplicate: vi.fn(),
  send: vi.fn(),
}));
vi.mock("../src/lib/design-archive",()=>({archiveDesign:vi.fn().mockResolvedValue("test/path")}));
vi.mock("../src/lib/db", () => ({
  db: {
    $transaction: async (fn: (tx: unknown)=>unknown)=>fn({$executeRaw:vi.fn(),asset:{create:mocks.create,findFirst:mocks.duplicate},sku:{findFirst:vi.fn().mockResolvedValue({code:"QP-0001"}),create:vi.fn()}}),
    design: { findUnique: mocks.find },
    asset: { create: mocks.create, findFirst: mocks.duplicate },
  },
}));
vi.mock("../src/lib/storage", () => ({
  s3: { send: mocks.send },
  bucket: () => "test",
}));
import { POST } from "../src/app/api/designs/[id]/assets/route";
function request(bytes: Uint8Array, name: string) {
  const form = new FormData();
  form.set("file", new Blob([bytes as Uint8Array<ArrayBuffer>]), name);
  return new Request("http://localhost/api/designs/d/assets", {
    method: "POST",
    headers:{origin:"http://localhost",host:"localhost"},
    body: form,
  });
}
const context = { params: Promise.resolve({ id: "d" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockResolvedValue({ id: "d",code:"QP-0001" });
  mocks.duplicate.mockResolvedValue(null);
  mocks.send.mockResolvedValue({});
  mocks.create.mockImplementation(async ({ data }) => ({ id: "a", ...data }));
});
describe("asset upload boundary", () => {
  it("extracts real PNG and TIFF dimensions", async () => {
    for (const f of ["png", "tiff"] as const) {
      const bytes = await sharp({
        create: { width: 18, height: 12, channels: 3, background: "white" },
      })
        .toFormat(f)
        .toBuffer();
      const r = await POST(request(bytes, `x.${f}`), context);
      expect(r.status).toBe(201);
      expect(await r.json()).toMatchObject({
        width: 18,
        height: 12,
        format: f,
        status: "METADATA_READY",
      });
    }
  });
  it("archives PSD without claiming metadata processing", async () => {
    const bytes = Buffer.alloc(26);
    bytes.write("8BPS");
    bytes.writeUInt16BE(1, 4);
    const r = await POST(request(bytes, "x.psd"), context);
    expect(r.status).toBe(201);
    const a = await r.json();
    expect(a.status).toBe("ARCHIVED");
    expect(a.width).toBeUndefined();
  });
  it("rejects renamed text before writing to storage", async () => {
    expect(
      (await POST(request(Buffer.from("fake"), "x.png"), context)).status,
    ).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects unknown designs", async () => {
    mocks.find.mockResolvedValue(null);
    expect(
      (await POST(request(Buffer.from("fake"), "x.png"), context)).status,
    ).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("cleans up the stored object if database persistence fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.create.mockRejectedValue(new Error("DB unavailable"));
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    expect((await POST(request(bytes, "x.png"), context)).status).toBe(500);
    expect(mocks.send.mock.calls.map((c) => c[0].constructor.name)).toEqual([
      "PutObjectCommand",
      "DeleteObjectCommand",
    ]);
    spy.mockRestore();
  });
  it("enforces body limits before buffering", async () => {
    const r = request(Buffer.from("fake"), "x.png");
    r.headers.set("content-length", String(200 * 1024 * 1024));
    expect((await POST(r, context)).status).toBe(413);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

it("reuses identical master files without decoding, storing or creating them twice", async () => {
  mocks.duplicate.mockResolvedValue({ id: "existing", name: "original.png" });
  const r = await POST(
    request(Buffer.from("existing-content"), "renamed.png"),
    context,
  );
  expect((await r.json()).reused).toBe(true);
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
