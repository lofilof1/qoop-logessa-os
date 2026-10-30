import { describe, it, expect } from "vitest";
import {
  assembleDescription,
  descriptionHeadings,
} from "../src/lib/listing-description";
import { blankProfile } from "../src/lib/product-profile";
const text =
  "A calm coastal marsh mural.\n\nDesign details:\n• Golden reeds and a creek.\n\nSize:\n400 × 300 cm\n\nRoom ideas\n• Living room";
describe("kullanıcının açıklama şablonu", () => {
  it("bütün bölümleri korur; örnek ölçüleri doğrulanmamış ürüne taşımaz", () => {
    const x = assembleDescription(text, null, "AI design", "AI mockups");
    for (const h of descriptionHeadings)
      expect(x.description).toContain(h + ":");
    expect(x.description).not.toContain("400");
    expect(x.missing).toContain("Size");
    expect(x.description).not.toContain("[SAMPLE PRICE]");
  });
  it("doğrulanmış tüm seçenekleri, mürekkebi, bakımı ve özel ölçü koşulunu korur", () => {
    const p = {
      ...blankProfile(),
      confirmed: true,
      muralWidth: 400,
      muralHeight: 300,
      muralPanels: 7,
      panelWidth: 58.42,
      customSizing: "Custom sizes available at no extra cost.",
      printingInks: "Printed with HP Latex water-based inks.",
      careInstructions: "Wipe clean with a soft, damp cloth.",
      materials: [
        {
          name: "Textured Traditional",
          details: "Paste-applied; paste not included",
        },
        {
          name: "Textured Peel and Stick",
          details: "Self-adhesive, removable",
        },
        { name: "3M Vinyl Smooth", details: "Self-adhesive smooth finish" },
      ],
      sampleUnit: "in" as const,
      sampleWidth: 15,
      sampleHeight: 20,
      samplePrice: "$10",
    };
    const x = assembleDescription(text, p, "AI design", "AI mockups");
    expect(x.description).toContain("7 panels");
    expect(x.description).toContain("157.5 × 118.1 in");
    expect(x.description).toContain("4:3");
    expect(x.description).toContain("15 × 20 in");
    for (const m of p.materials) expect(x.description).toContain(m.name);
    expect(x.description).toContain(p.printingInks);
    expect(x.description).toContain(p.careInstructions);
    expect(x.description).toContain(p.customSizing);
    expect(x.description).toContain("$10");
    expect(x.missing).toEqual([]);
  });
  it("numune fiyatı bilinmiyorsa şablon yazmaz, kontrol bilgisine ayırır", () => {
    const x = assembleDescription(
      text,
      { ...blankProfile(), confirmed: true, sampleWidth: 15, sampleHeight: 20 },
      "AI design",
      "AI mockups",
    );
    expect(x.missing).toContain("Sample price");
    expect(x.description).not.toContain("[SAMPLE PRICE]");
  });
  it("tekrar biçimlendirmek bölümleri ve AI beyanlarını çoğaltmaz", () => {
    const a = assembleDescription(text, null, "AI design", "AI mockups");
    const b = assembleDescription(
      a.description,
      null,
      "AI design",
      "AI mockups",
    );
    expect(b.description).toBe(a.description);
  });
});

it('uses the approved full standard without leaking landscape motifs or an example fixed size',()=>{
 const p={...blankProfile(),confirmed:true,descriptionStandard:'qoop-2026-10-28' as const};
 const a=assembleDescription('Art Deco fan wallpaper.\n\nDesign details:\n• Gold fan motifs.\n\nIdeas for your space:\n• A reading room',p,'AI + Photoshop','AI mockups','wall mural');
 for(const phrase of ['24 in wide: 23 in','15 x 20 inch','15 days','UL GREENGUARD Gold','5-7 business days','free replacement','Cannot be reused once removed'])expect(a.description).toContain(phrase);
 expect(a.description).not.toContain('reeds');expect(a.description).not.toContain('400');
 expect(a.sections.map(s=>s.heading)).toEqual(['Design details','Size','Material & installation','Samples','Ideas for your space','Production & shipping','Design process','Mockup images']);
 expect(a.missing).toEqual([]);
 expect(assembleDescription(a.description,p,'AI + Photoshop','AI mockups','wall mural').description).toBe(a.description);
 const wallpaper=assembleDescription('Wallpaper',p,'AI','Mockup','wallpaper');expect(wallpaper.description).not.toContain('one complete artwork');
});
it('uses the current LOGESSA template, material names and revised shipping without old policies',()=>{
 const p={...blankProfile(),confirmed:true,descriptionStandard:'logessa-2026-10-29' as const};
 const a=assembleDescription('Blue cranes above a marsh.\n\nDesign details:\n• Blue crane motifs.\n\nIdeas for your space:\n• Reading corners',p,'AI + Photoshop','AI mockups','wall mural','Blue Crane Artwork');
 for(const s of ['Blue Crane Artwork | LOGESSA','1-inch overlap','20 × 15 inch sample','Traditional Luxury Textured Fabric','Controltac','Houston, Texas','3–7 business days','2–6 business days','Sample orders do not include installation tools.','Thank you for choosing LOGESSA.'])expect(a.description).toContain(s);
 expect(a.description).not.toContain('Qoop');expect(a.description).not.toContain('free replacement');expect(a.description).not.toContain('golden-brown reeds');
 expect(assembleDescription(a.description,p,'AI + Photoshop','AI mockups','wall mural','Blue Crane Artwork').description).toBe(a.description);
});
