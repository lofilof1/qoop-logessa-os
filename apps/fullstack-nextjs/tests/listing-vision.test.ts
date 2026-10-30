import { describe, it, expect } from "vitest";
import {
  skuFromFilename,
  visionCandidates,
  validateVisionListing,
  designDisclosure,
  mockupDisclosure,
  type ListingVisual,
} from "../src/lib/listing-vision";
const visual: ListingVisual = {
  imageRead: true,
  summary: "Krem zeminde yeşil yapraklar ve kuşlar görülüyor.",
  subject: "botanical birds",
  motifs: ["birds", "leaves"],
  colors: ["green", "cream"],
  styles: ["watercolor"],
  searchTerms: ["botanical wallpaper", "bird wallpaper", "green wallpaper"],
  rooms: ["bedroom"],
  product: "wallpaper",
  imageKind: "artwork",
  uncertainties: [],
};
const listing = {
  imageRead: true,
  visualSummary: visual.summary,
  title: "Wallpaper with Green Botanical Leaves and Birds",
  tags: [
    "bird wallpaper",
    "botanical wallpaper",
    "green wallpaper",
    "watercolor birds",
    "leaf wall decor",
    "cream wall decor",
    "nature wall decor",
    "bird wall decor",
    "botanical decor",
    "garden wall decor",
    "soft green decor",
    "bedroom wallpaper",
    "illustrated leaves",
  ],
  description:
    "Green botanical wallpaper pairs illustrated birds and leaves with a calm cream background for a nature-inspired space.",
  rationale: "Görseldeki öğelere göre seçildi.",
  warnings: [],
};
describe("görselden listing sözleşmesi", () => {
  it("dosyadan SKU ve düzenleme ekini alır; belirsiz kodu tahmin etmez", () => {
    expect(skuFromFilename("MZ-0001-D-final.png")).toBe("MZ-0001-D");
    expect(skuFromFilename("AD-0001-D.png")).toBe("AD-0001-D");
    expect(skuFromFilename("QOOP-ABC12345.png")).toBe("QOOP-ABC12345");
    expect(skuFromFilename("MZ0001-D.png")).toBe("MZ0001-D");
    expect(skuFromFilename("image.png")).toBeNull();
    expect(() => skuFromFilename("MZ-0001-D AD-0002-D.png")).toThrow();
  });
  it("popüler ama yanlış motif ve doğrulanmamış malzemeyi elemeden geçirmez", () => {
    const c = visionCandidates(
      [
        "bird wallpaper",
        "green wallpaper",
        "tiger wallpaper",
        "peel and stick",
      ].map((term) => ({ term, category: "test", data: {} })),
      visual,
    );
    expect(c.map((x) => x.term)).toEqual(
      expect.arrayContaining(["bird wallpaper", "green wallpaper"]),
    );
    expect(c.map((x) => x.term)).not.toContain("tiger wallpaper");
    expect(c.map((x) => x.term)).not.toContain("peel and stick");
  });
  it("eRank kaynağı ile görsel önerisini ayırır; iki AI beyanını saklar", () => {
    const c = visionCandidates(
      [
        {
          term: "bird wallpaper",
          category: "test",
          data: {
            reportedSearches: "100",
            reportedCompetition: "200",
            metricsVerified: false,
            sourceFile: "birds.csv",
            sourceRow: 2,
          },
        },
      ],
      visual,
    );
    const x = validateVisionListing(listing, visual, c, null);
    expect(x.result.description).toContain(designDisclosure);
    expect(x.result.description).toContain(mockupDisclosure);
    expect(x.evidence[0]).toMatchObject({
      origin: "research",
      rankingAllowed: false,
      sourceRow: 2,
    });
    expect(x.evidence[1].origin).toBe("visual-suggestion");
  });
  it("görsel okunmadıysa ya da doğrulanmamış ürün iddiası varsa başarılı saymaz", () => {
    expect(() =>
      validateVisionListing({ ...listing, imageRead: false }, visual, [], null),
    ).toThrow();
    expect(() =>
      validateVisionListing(
        { ...listing, title: "Removable Waterproof Botanical Wallpaper" },
        visual,
        [],
        null,
      ),
    ).toThrow();
  });
});

describe("doğrulanmış araştırma ve ürün özellikleri", () => {
  it("bilinmeyen dönem veya farklı karşılaştırma grubu sayıları sıralamaya katmaz", () => {
    const rows = [
      {
        term: "bird wallpaper",
        category: "x",
        data: {
          metricsVerified: true,
          period: "2026-09",
          aylik_arama: "100",
          rakip_ilan: "100",
        },
      },
      {
        term: "green wallpaper",
        category: "x",
        data: {
          metricsVerified: true,
          period: "2026-08",
          aylik_arama: "1000",
          rakip_ilan: "100",
        },
      },
      {
        term: "botanical wallpaper",
        category: "x",
        data: {
          metricsVerified: false,
          columns: { "average searches": "99999" },
        },
      },
    ];
    const c = visionCandidates(rows, visual);
    expect(c.find((r) => r.term === "bird wallpaper")?.rankingAllowed).toBe(
      true,
    );
    expect(c.find((r) => r.term === "green wallpaper")?.rankingAllowed).toBe(
      false,
    );
    expect(
      c.find((r) => r.term === "botanical wallpaper")?.rankingAllowed,
    ).toBe(false);
  });
  it("peel & stick ve self-adhesive gibi doğrulanmamış eşanlamlıları engeller", () => {
    for (const claim of [
      "Peel & Stick",
      "Self-Adhesive",
      "Nonwoven",
      "Eco-Friendly",
    ])
      expect(() =>
        validateVisionListing(
          { ...listing, title: claim + " Botanical Wallpaper" },
          visual,
          [],
          null,
        ),
      ).toThrow();
  });
});

import { profileWarnings, blankProfile } from "../src/lib/product-profile";
import {
  listingPreferences,
  listingChecks,
  composeListingInstruction,
  type VisionListingInput,
} from "../src/lib/listing-vision";
describe("PRO karar sözleşmesi", () => {
  it("eski profillere güvenli varsayılanlar verir; satış biçimini onaylamaz", () => {
    const p = blankProfile();
    expect(listingPreferences(p)).toMatchObject({
      targetMarket: "US",
      listingLanguage: "en",
      saleForm: "unknown",
    });
    const c = validateVisionListing(listing, visual, [], null).checks;
    expect(c.find((x) => x.id === "profile")?.state).toBe("UNKNOWN");
    expect(c.find((x) => x.id === "sale")?.state).toBe("UNKNOWN");
    expect(c.some((x) => x.state === "ERROR")).toBe(false);
  });
  it("müşteri metnindeki doldurulmamış şablonları reddeder", () => {
    expect(() =>
      validateVisionListing(
        { ...listing, description: listing.description + " [MATERIAL]" },
        visual,
        [],
        null,
      ),
    ).toThrow(/şablon/);
  });
  it("kayıtlı marka yasaklarını uygular", () => {
    expect(() =>
      validateVisionListing(listing, visual, [], null, "", {
        ...listingPreferences(null),
        excludedPhrases: "Green Botanical",
      }),
    ).toThrow(/yasaklanan/);
  });
  it("farklı hedef pazarın doğrulanmış sayısını kıyasa katmaz", () => {
    const rows = [
      {
        term: "bird wallpaper",
        category: "x",
        data: {
          market: "US",
          metricsVerified: true,
          period: "2026-09",
          aylik_arama: "300",
          rakip_ilan: "10",
        },
      },
    ];
    expect(visionCandidates(rows, visual, 50, "UK")[0].rankingAllowed).toBe(
      false,
    );
  });
  it("kullanıcı belirsizliğini korur ve sayısal güven puanı uydurmaz", () => {
    const x = validateVisionListing(
      listing,
      { ...visual, uncertainties: ["Motifin türü belirsiz."] },
      [],
      null,
    );
    expect(x.status).toBe("NEEDS_REVIEW");
    expect(x.checks.find((c) => c.id === "visual-uncertainty")?.state).toBe(
      "UNKNOWN",
    );
  });
  it("rol, kaynak önceliği, marka ve hedef pazar talimata girer", () => {
    const input = {
      kind: "listing-vision",
      version: "test",
      previewKey: "x",
      imageHash: "x",
      sku: "AD-0001-D",
      notes: "",
      profile: null,
      profileId: null,
      material: "",
      product: "auto",
      datasetHash: "x",
      aiPolicy: "ai-assisted-photoshop-and-ai-mockups",
      preferences: {
        ...listingPreferences(null),
        targetMarket: "UK",
        brandVoice: "calm and clear",
      },
    } as VisionListingInput;
    const s = composeListingInstruction(input, visual, []);
    expect(s).toContain("SOURCE PRIORITY");
    expect(s).toContain("calm and clear");
    expect(s).toContain("UK");
    expect(s).toContain("UNKNOWN");
  });
});

it("yasaklı marka ifadesi teknik ürün iddiası gibi değerlendirilmez", () => {
  const p = { ...blankProfile(), excludedPhrases: "non-toxic, made in USA" };
  expect(profileWarnings(p).some((x) => x.includes("Genel sağlık"))).toBe(
    false,
  );
});
