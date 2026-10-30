import { describe, it, expect } from "vitest";
import {
  designInput,
  skuInput,
  sourceInput,
  detectFormat,
} from "../src/lib/validation";
describe("catalog boundaries", () => {
  it("rejects blank design names and invalid codes", () => {
    expect(designInput.safeParse({ code: "../x", title: " " }).success).toBe(
      false,
    );
  });
  it("keeps SKU tied to a design", () => {
    expect(
      skuInput.safeParse({ code: "QP-0001-01", label: "Wallpaper" }).success,
    ).toBe(false);
  });
  it("requires a prompt and safe source protocol", () => {
    expect(sourceInput.safeParse({ prompt: " " }).success).toBe(false);
    expect(
      sourceInput.safeParse({
        prompt: "garden",
        sourceUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
  it("accepts Midjourney metadata", () => {
    expect(sourceInput.parse({ prompt: "garden", seed: "42" }).seed).toBe("42");
  });
  it("detects file signatures instead of trusting extension", () => {
    expect(detectFormat(Buffer.from("49492a0000000000", "hex"))).toBe("tiff");
    expect(detectFormat(Buffer.from("3842505300010000", "hex"))).toBe("psd");
    expect(detectFormat(Buffer.from("89504e470d0a1a0a", "hex"))).toBe("png");
    expect(() => detectFormat(Buffer.from("not an image"))).toThrow();
  });
});
