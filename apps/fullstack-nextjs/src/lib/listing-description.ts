import {logessaDescription,logessaDescriptionVersion} from "./logessa-description";
import {descriptionStandardVersion,standardDescriptionBodies} from "./listing-description-standard";
import type { ProductProfile } from "./product-profile";
export const descriptionHeadings = [
  "Design details",
  "Size",
  "Material & installation",
  "Samples",
  "Ideas for your space",
 ] as const;
export function descriptionSections(text: string) {
  const map = new Map<string, string>();
  let key = "Opening";
  let lines: string[] = [];
  const flush = () => map.set(key, lines.join("\n").trim());
  for (const line of text.split("\n")) {
    const cleaned = line.trim().replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").toLowerCase();
    const aliases:Record<string,string>={"📏 size & custom orders":"Size","✨ choose your wallpaper material":"Material & installation","📦 what's included":"What is included","🎨 wallpaper samples":"Samples","🏡 perfect for":"Ideas for your space","🚚 production & shipping":"Production & shipping","↩️ returns & order support":"Returns & support","🎨 design & mockup disclosure":"Design process","💌 need help?":"Support"};
    const heading = aliases[cleaned] || [
      ...descriptionHeadings,
      "Production & shipping",
      "Design process",
      "Mockup images",
      "Room ideas",
      "Processing & shipping",
      "Returns & support",
      "Production location",
      "Production partner",
      "What is included",
    ].find((h) => h.toLowerCase() === cleaned);
    if (heading) {
      flush();
      key = heading === "Room ideas" ? "Ideas for your space" : heading;
      lines = [];
    } else lines.push(line);
  }
  flush();
  return map;
}
export function assembleDescription(
  text: string,
  p: ProductProfile | null,
  designDisclosure: string,
  mockupDisclosure: string,
  product = p?.saleForm === "physical-mural" ? "wall mural" : "wallpaper",
  title = "",
) {
  const parsed = descriptionSections(text),
    profile = p?.confirmed ? p : null;
  if(profile?.descriptionStandard === logessaDescriptionVersion)return logessaDescription(parsed.get("Opening")||"",parsed.get("Design details")||"",parsed.get("Ideas for your space")||"",product,title,designDisclosure,mockupDisclosure);
  const section = (heading: string, body: string) => ({
    heading,
    body: body.trim(),
    state: body.trim() ? ("READY" as const) : ("MISSING" as const),
  });
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const size: string[] = [];
  if (profile) {
    const unit = profile.unit;
    if (profile.muralWidth && profile.muralHeight)
      size.push(
        `• Mural ${profile.muralWidth} × ${profile.muralHeight} ${unit}${profile.muralPanels ? `, divided into ${profile.muralPanels} panels` : ""}.`,
      );
    if (profile.muralWidth && profile.muralHeight) {
      const cm = (n: number) => (profile.unit === "cm" ? n : n * 2.54);
      const w = cm(profile.muralWidth),
        h = cm(profile.muralHeight);
      const divisor = gcd(Math.round(w * 100), Math.round(h * 100));
      size.push(
        `• ${Number((w / 2.54).toFixed(1))} × ${Number((h / 2.54).toFixed(1))} in (${Number(w.toFixed(2))} × ${Number(h.toFixed(2))} cm). Aspect ratio: ${Math.round(w * 100) / divisor}:${Math.round(h * 100) / divisor}.`,
      );
    }
    if (profile.panelWidth)
      size.push(`• Each panel is ${profile.panelWidth} ${unit} wide.`);
    if (profile.heights.length)
      size.push(
        `• Available panel heights: ${profile.heights.join(", ")} ${unit}.`,
      );
    if (profile.orderUnit === "wall")
      size.push("• One complete artwork for a full wall order.");
    if (profile.customSizing) size.push("• " + profile.customSizing);
  }
  const materials: string[] = [];
  if (profile) {
    for (const m of profile.materials)
      materials.push(`• ${m.name}${m.details ? ": " + m.details : ""}.`);
    if (profile.printingInks) materials.push("• " + profile.printingInks);
    if (profile.careInstructions)
      materials.push("• " + profile.careInstructions);
    if (profile.surface) materials.push("• " + profile.surface);
  }
  const samples =
    profile?.sampleWidth && profile.sampleHeight
      ? `• Sample size: ${profile.sampleWidth} × ${profile.sampleHeight} ${profile.sampleUnit || profile.unit}.${profile.samplePrice ? " Price: " + profile.samplePrice + "." : ""}`
      : "";
  const sections = [
    section("Design details", parsed.get("Design details") || ""),
    section("Size", size.join("\n")),
    section("Material & installation", materials.join("\n")),
    section("Samples", samples),
    section("Ideas for your space", parsed.get("Ideas for your space") || ""),
  ];
  const opening = parsed.get("Opening") || "";
  const extra = profile
    ? [
        [
          "Processing & shipping",
          [profile.processing, profile.shipping].filter(Boolean).join("\n"),
        ],
        ["Returns & support", profile.returns],
        ["Production location", profile.productionLocation],
        ["Production partner", profile.productionPartner],
        ["What is included", profile.toolkit],
      ]
        .filter(([, body]) => body)
        .map(([heading, body]) => ({ heading, body, state: "READY" as const }))
    : [];
  const all = [
    ...sections,
    ...extra,
    {
      heading: "Design process",
      body: designDisclosure,
      state: "READY" as const,
    },
    {
      heading: "Mockup images",
      body: mockupDisclosure,
      state: "READY" as const,
    },
  ];
  if(profile?.descriptionStandard === descriptionStandardVersion){
    const standard=standardDescriptionBodies(product);
    for(const [heading,body]of Object.entries(standard)){
      const existing=all.find(s=>s.heading===heading);
      if(existing){existing.body=body;existing.state="READY";}else all.splice(all.findIndex(s=>s.heading==="Design process"),0,section(heading,body));
    }
    // Delivery/support/toolkit are already part of the approved standard sections.
    for(let i=all.length-1;i>=0;i--)if(["Processing & shipping","Returns & support","Production location","What is included"].includes(all[i].heading))all.splice(i,1);
  }
  const missingDetails =
    profile?.descriptionStandard !== descriptionStandardVersion && profile?.sampleWidth && profile.sampleHeight && !profile.samplePrice
      ? ["Sample price"]
      : [];
  return {
    description: [opening, ...all.map((s) => s.heading + ":\n" + s.body)]
      .filter(Boolean)
      .join("\n\n"),
    sections: all,
    missing: [
      ...all.filter((s) => s.state === "MISSING").map((s) => s.heading),
      ...missingDetails,
    ],
  };
}
