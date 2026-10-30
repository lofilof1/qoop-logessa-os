import { localTagPool, chooseLocalTags } from "../src/lib/local-listing-tags";
import { z } from "zod";
import { runLocalVision } from "./local-vision";
import { assertClaudeConsent } from "../src/lib/analysis-engine";
import { visualSchema } from "../src/lib/listing-vision";
import { db } from "../src/lib/db";
import { runVision } from "./vision-cli";
import { parseListing } from "../src/lib/listing";
import { publishPackage } from "../src/lib/publication";
import { listingResearchRows } from "../src/lib/listing-research";
import {
  hashInput,
  visualVersion,
  visualInstruction,
  parseVisual,
  visionCandidates,
  composeListingInstruction,
  validateVisionListing,
  type VisionListingInput,
  listingPreferences,
} from "../src/lib/listing-vision";
export async function processListingJob(
  id: string,
  input: VisionListingInput,
  image: Buffer,
) {
  await db.analysisReviewJob.update({
    where: { id },
    data: { result: { stage: "READING_IMAGE" } },
  });
  const provider = input.provider || "local";
  if (provider === "claude") assertClaudeConsent(input);
  const visualHash = hashInput({
    version: visualVersion,
    imageHash: input.imageHash,
    provider,
  });
  const first =
    provider === "local"
      ? await runLocalVision(
          image,
          visualInstruction,
          visualHash,
          z.toJSONSchema(visualSchema),
          parseVisual,
        )
      : await runVision(
          image,
          visualInstruction,
          visualHash,
          "listing",
          parseVisual,
          true,
        );
  if (first.result.imageKind === "other")
    throw Error(
      "Görsel bir tasarım veya tasarımı gösteren mockup olarak tanınamadı. Tasarım görselini yükle.",
    );
  await db.analysisReviewJob.update({
    where: { id },
    data: { result: { stage: "MATCHING_KEYWORDS" } },
  });
  const preferences = input.preferences || listingPreferences(input.profile);
  const rows = await listingResearchRows(preferences.targetMarket);
  const effectiveProduct =
    input.product !== "auto"
      ? input.product
      : preferences.saleForm === "physical-mural"
        ? "wall mural"
        : preferences.saleForm === "physical-wallpaper"
          ? "wallpaper"
          : first.result.product;
  const candidates = visionCandidates(
    rows,
    {
      ...first.result,
      product: effectiveProduct,
    },
    50,
    preferences.targetMarket,
  );
  const instruction = composeListingInstruction(
    { ...input, product: effectiveProduct },
    first.result,
    candidates,
  );
  const textHash = hashInput({
    version: input.version,
    visual: first.result,
    instruction,
    provider,
  });
  const textSchema = z.object({
    imageRead: z.literal(true),
    visualSummary: z.string().min(10).max(800),
    title: z.string().min(10).max(140),
    tags: z.array(z.string().min(1).max(20)).length(13),
    description: z.string().min(40).max(5500),
    rationale: z.string().max(1000),
    warnings: z.array(z.string().max(400)).max(3),
  });
  const second =
    provider === "local"
      ? await runLocalVision(
          null,
          instruction,
          textHash,
          z.toJSONSchema(textSchema),
          parseListing,
        )
      : await runVision(
          null,
          instruction,
          textHash,
          "listing",
          parseListing,
          true,
        );
  const checked = validateVisionListing(
    {
      ...second.result,
      tags: chooseLocalTags(second.result.tags, localTagPool(first.result, candidates)),
    },
    first.result,
    visionCandidates(
      rows,
      {
        ...first.result,
        product: effectiveProduct,
      },
      Number.MAX_SAFE_INTEGER,
      preferences.targetMarket,
    ),
    input.profile,
    input.material,
    preferences,
  );
  if (provider === "local") {
    const supported = checked.evidence.filter(
      (e) => e.origin === "research",
    ).length;
    checked.result.rationale = `Gerçek görsel Mac üzerindeki yerel modelle okundu. Etiketlerin ${supported} tanesi ilgili araştırma kaydıyla eşleşti; kalanlar görsel/ürün temelli öneridir. Kaynak bağlamı doğrulanmamış sayılar talep sıralaması olarak kullanılmadı. Claude çağrısı yapılmadı.`;
  }
  const publication = publishPackage(
    "",
    input.profile,
    input.profileId,
    input.material,
    "yes",
  ).publication;
  publication.checks = publication.checks.filter(
    (c) => !c.startsWith("AI beyanı için"),
  );
  publication.checks.push(
    "Mockupların AI ile oluşturulduğu açıklandı. Yayından önce gerçek ürün fotoğrafı ve varsa üretim ortağı/mockup istisnasının uygunluğunu doğrula.",
  );
  const result = {
    ...checked.result,
    provider,
    visual: first.result,
    tagEvidence: checked.evidence,
    checks: checked.checks,
    descriptionSections: checked.sections,
    missingSections: checked.missingSections,
    reviewStatus: checked.status,
    uncertainties: first.result.uncertainties,
    preferences,
    quality: checked.quality,
    publication,
  };
  await db.analysisReviewJob.update({
    where: { id },
    data: {
      state: "SUCCEEDED",
      result: JSON.parse(JSON.stringify(result)),
      usage: {
        image: first.usage,
        listing: second.usage,
        imageCached: first.cached,
        listingCached: second.cached,
      },
      finishedAt: new Date(),
    },
  });
}
