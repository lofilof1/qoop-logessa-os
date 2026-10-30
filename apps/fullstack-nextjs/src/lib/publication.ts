import type { ProductProfile } from "./product-profile";
import { invalidClaim } from "./product-profile";
export const imagePlan = [
  {
    id: "hero",
    label: "Ana görsel",
    brief:
      "Show the actual design in a representative room; no placeholder text.",
  },
  {
    id: "detail",
    label: "Yakın plan",
    brief:
      "Show actual motif detail and realistic scale; do not invent material texture.",
  },
  {
    id: "materials",
    label: "Malzemeler",
    brief: "Explain only confirmed material options.",
  },
  {
    id: "panels",
    label: "Panel sistemi",
    brief: "Show confirmed total width, visible width and overlap.",
  },
  {
    id: "measure",
    label: "Ölçü ve sipariş",
    brief: "Explain wall measurement and the confirmed panel calculation.",
  },
  {
    id: "quantity",
    label: "Sipariş adedi",
    brief: "Explain what one purchased unit includes; distinguish a sample.",
  },
  {
    id: "sample",
    label: "Numune",
    brief: "Show confirmed sample dimensions and price, if offered.",
  },
  {
    id: "included",
    label: "Paket içeriği",
    brief:
      "Show only confirmed included tools/items; distinguish sample orders.",
  },
  {
    id: "shipping",
    label: "Üretim ve teslimat",
    brief:
      "Show confirmed processing and shipping information without guarantees.",
  },
] as const;
export type Publication = {
  profileId: string | null;
  checks: string[];
  faq: { question: string; answer: string }[];
  variations: { name: string; options: string[] }[];
  imagePlan: typeof imagePlan;
  aiUsed: string;
  productionPartner: string;
  status: "DRAFT_ONLY";
};
export function publishPackage(
  description: string,
  p: ProductProfile | null,
  profileId: string | null,
  material: string,
  aiUsed: string,
) {
  const checks: string[] = [],
    faq: Publication["faq"] = [],
    variations: Publication["variations"] = [],
    parts = [description];
  const safe = (text: string) =>
    !!text && !invalidClaim.test(text) && !/[çğıöşü]/i.test(text);
  if (!p?.confirmed)
    checks.push("Ürün profili doğrulanmadı; teknik ürün bilgileri eklenmedi.");
  if (p?.confirmed) {
    if (p.panelWidth !== null && p.overlap !== null) {
      const visible = Number((p.panelWidth - p.overlap).toFixed(4));
      const unit = p.unit === "in" ? "inches" : "cm";
      const panel = `Each panel is ${p.panelWidth} ${unit} wide, including ${visible} ${unit} of visible design and ${p.overlap} ${unit} of overlap.${p.orderUnit === "panel" ? " Quantity 1 = one panel." : p.orderUnit === "wall" ? " Quantity 1 = one complete wall order, according to the confirmed dimensions." : ""} Panels needed = wall width in ${unit} divided by ${visible}, rounded up.`;
      parts.push("PANELS & ORDERING\n" + panel);
      faq.push({
        question: "How many panels do I need?",
        answer: `Divide your wall width in ${unit} by ${visible} and round up. Confirm the first/last panel and trimming plan before production.`,
      });
    } else
      checks.push(
        "Panel genişliği veya bindirme bilinmiyor; ölçü/adet açıklaması eksik.",
      );
    if (p.orderUnit === "unknown")
      checks.push("Sipariş birimi panel/tam duvar olarak belirlenmeli.");
    const selected = p.materials.find((m) => m.name === material);
    if (selected && safe(selected.name) && safe(selected.details)) {
      parts.push(`MATERIAL\n${selected.name}: ${selected.details}`);
      faq.push({
        question: "Which material is this listing for?",
        answer: `${selected.name}: ${selected.details}`,
      });
    } else
      checks.push(
        "Doğrulanmış malzeme ve İngilizce özellik açıklaması seçilmeli.",
      );
    if (p.materials.length)
      variations.push({
        name: "Material",
        options: p.materials.map((m) => m.name),
      });
    if (p.heights.length)
      variations.push({
        name: "Panel height",
        options: p.heights.map((h) => `${h} ${p.unit}`),
      });
    else checks.push("Panel yüksekliği seçenekleri belirlenmedi.");
    if (p.sampleWidth && p.sampleHeight) {
      parts.push(
        `SAMPLES\nSample size: ${p.sampleWidth} x ${p.sampleHeight} ${p.sampleUnit || p.unit}.${safe(p.samplePrice) ? ` Price: ${p.samplePrice}.` : ""} Screen colors may differ from printed colors.`,
      );
      faq.push({
        question: "Can I order a sample?",
        answer: `Sample size: ${p.sampleWidth} x ${p.sampleHeight} ${p.sampleUnit || p.unit}. Confirm sample content and pricing before ordering.`,
      });
    } else checks.push("Numune sunulup sunulmadığı ve ölçüsü belirtilmeli.");
    for (const [label, value] of [
      ["PRODUCTION LOCATION", p.productionLocation],
      ["PROCESSING", p.processing],
      ["SHIPPING", p.shipping],
      ["SURFACE", p.surface],
      ["WHAT IS INCLUDED", p.toolkit],
      ["RETURNS & SUPPORT", p.returns],
    ]) {
      if (safe(value)) parts.push(label + "\n" + value);
      else
        checks.push(
          label +
            ": doğrulanmış İngilizce metin eksik veya iddia kontrolü gerekli.",
        );
    }
    if (p.productionPartner && safe(p.productionPartner)) {
      parts.push(
        "PRODUCTION PARTNER\nPrinted with the assistance of " +
          p.productionPartner +
          ".",
      );
      checks.push(
        "Üretim ortağı bilgisi varsa Etsy listing ayarlarında ayrıca belirtilmeli.",
      );
    }
    if (aiUsed === "yes") {
      if (safe(p.shopName))
        parts.push(
          `DESIGN PROCESS\nThis design was created by ${p.shopName} with the help of AI tools.`,
        );
      else checks.push("AI beyanı için mağaza adı gerekli.");
    }
  }
  if (aiUsed === "yes" && !p?.confirmed)
    checks.push("AI beyanı için doğrulanmış mağaza/ürün profili gerekli.");
  if (aiUsed === "unknown")
    checks.push("Bu tasarımda AI kullanımı evet/hayır olarak belirtilmeli.");
  if (invalidClaim.test(description))
    checks.push(
      "Açıklamada doğrulanmamış genel sağlık/üstünlük/menşe iddiası var.",
    );
  if (/[çğıöşü]/i.test(description))
    checks.push(
      "Müşteri metninde Türkçe sözcük var; İngilizce kontrolü gerekli.",
    );
  checks.push(
    "Görsellerdeki ölçü, malzeme ve adet bilgisini metinle karşılaştır. Etsy’ye otomatik yayın yapılmaz.",
  );
  return {
    description: parts.join("\n\n"),
    publication: {
      profileId,
      checks,
      faq,
      variations,
      imagePlan,
      aiUsed,
      productionPartner: p?.productionPartner || "",
      status: "DRAFT_ONLY" as const,
    },
  };
}
