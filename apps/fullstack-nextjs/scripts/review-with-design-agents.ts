import { db } from "../src/lib/db";
import { s3, bucket } from "../src/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { runVision } from "./vision-cli";
import { reviewInput, reviewInstruction } from "../src/lib/analysis-review";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import sharp from "sharp";
const found = await db.imageAnalysis.findFirst({ orderBy: { createdAt: "desc" } });
if (!found?.reviewJobId) throw Error("İncelenecek kayıtlı rapor yok.");
const a = found;
const job = await db.analysisReviewJob.findUniqueOrThrow({
  where: { id: a.reviewJobId! },
});
if (job.state !== "SUCCEEDED") throw Error("Önce ilk analiz tamamlanmalı.");
const old = job.result as any;
const { input } = reviewInput(a);
const file = await s3.send(
  new GetObjectCommand({ Bucket: bucket(), Key: a.previewKey }),
);
const image = await sharp(Buffer.from(await file.Body!.transformToByteArray()))
  .resize({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true,
  })
  .flatten({ background: "white" })
  .jpeg({ quality: 88 })
  .toBuffer();
const baseline = {
  summary: old.summary,
  preserve: old.preserve,
  priorities: old.priorities,
  correctedPrompt: old.correctedPrompt,
  negativePrompt: old.negativePrompt,
};
const scope = `Bu bir ikinci uzman denetimidir: görseli ve önceki rapor/promptu birlikte denetle. Raporu körü körüne onaylama. Görselin hedefinin formda yanlışlıkla pattern seçilmiş olabileceğini belirt; hedef teyit edilmeden sahneyi parçalı repeat'e dönüştürmeyi zorunlu kılma. Özellikle preserve içinde su yansımaları korunurken önceki correctedPrompt'un suyu kaldırması gibi tutarsızlıkları yakala. Ana önerilen correctedPrompt, özgün mimari sahneyi ve suyu koruyan MURAL revizyonu olsun; bunun mevcut pattern alanından farklı, kullanıcı onayı gerektiren önerilen hedef olduğunu açıkla. Pattern seçeneği ayrı bir yeniden tasarım kararıdır, aynısını koruma iddiası kurma. Paylaşılan ders ölçütlerini eleştirel uygula. Kesin yoğunluk yüzdeleri ölçülmediyse öneri/tahmin diye işaretle. Yeni piksel boyutu/gerçek metalik baskı garantisi verme. Çıktı JSON şemasını koru; summary alanında ajanının kararını, priorities alanında rapor/prompt/akış tutarlılığındaki düzeltmeleri, correctedPrompt alanında tutarlı mural promptunu ver. Marka dili önerilerini onaylı Qoop standardı sayma.\nÖnceki sonuç:\n${JSON.stringify(baseline)}`;
async function review(role: "brand" | "prompt", extra: string) {
  const agentPath =
    homedir() +
    "/.claude/agents/" +
    (role === "brand"
      ? "design-brand-guardian.md"
      : "design-image-prompt-engineer.md");
  const agent = await readFile(agentPath, "utf8");
  const instruction =
    reviewInstruction(input) + "\n\n" + scope + "\n\n" + extra;
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        policy: "agent-cross-review-v1",
        image: a.sha256,
        role,
        agent,
        instruction,
        model: "sonnet",
      }),
    )
    .digest("hex");
  const result = await runVision(image, instruction, hash, role,undefined,process.argv.includes("--allow-claude"));
  return { role, hash, ...result };
}
const brand = await review(
  "brand",
  "Görevin: özgün görsel dili, aile tutarlılığı ve neyin korunacağını denetle. Marka onayı veya rakip satış çıkarımı yapma.",
);
console.log("Brand Guardian incelemesi tamamlandı.");
const prompt = await review(
  "prompt",
  "Görevin: Brand Guardian değerlendirmesiyle önceki raporu uzlaştır, gözlemi düzeltme talimatına çevir. Son Türkçe summary kullanıcıya açık bir sonuç özeti olsun. İstenen mural promptu içinde korunacakların hepsi açıkça bulunsun, negatif istem bunlarla çelişmesin. Brand Guardian sonucu:\n" +
    JSON.stringify({
      summary: brand.result.summary,
      preserve: brand.result.preserve,
      priorities: brand.result.priorities,
      limits: brand.result.limits,
    }),
);
console.log("Image Prompt Engineer incelemesi tamamlandı.");
const folder = "../qoop-tasarim-ajanlari";
await mkdir(folder, { recursive: true });
await writeFile(
  folder + "/uzman-incelemeleri.json",
  JSON.stringify(
    {
      analysisId: a.id,
      title: a.title,
      createdAt: new Date().toISOString(),
      baseline,
      brand,
      prompt,
    },
    null,
    2,
  ),
);
let md = `# ${a.title} — Claude tasarım ajanları değerlendirmesi\n\n`;
for (const x of [brand, prompt]) {
  md +=
    `## ${x.role === "brand" ? "Brand Guardian" : "Image Prompt Engineer"}\n\n${x.result.summary}\n\n### Öncelikli düzeltmeler\n\n` +
    x.result.priorities
      .map(
        (p, i) =>
          `${i + 1}. **${p.issue}**\n\n${p.action}\n\nYöntem: ${p.tool}`,
      )
      .join("\n\n") +
    "\n\n### Korunacaklar\n\n" +
    x.result.preserve.map((p) => "- " + p).join("\n") +
    "\n\n";
}
md +=
  "## Önerilen mural revizyon promptu\n\n" +
  prompt.result.correctedPrompt +
  "\n\n## Negatif istem\n\n" +
  prompt.result.negativePrompt +
  "\n\n## Kontrol sınırları\n\n" +
  prompt.result.limits.map((x) => "- " + x).join("\n") +
  "\n";
await writeFile(folder + "/tasarim-ajanlari-raporu.md", md);
const label = "[CLAUDE_TASARIM_AJANLARI_V1]";
const existing = a.report || "";
if (!existing.includes(label))
  await db.imageAnalysis.update({
    where: { id: a.id },
    data: {
      report: (existing + "\n\n" + label + "\n" + md).trim().slice(0, 50000),
    },
  });
console.log(
  JSON.stringify({
    saved: true,
    summary: prompt.result.summary,
    priorities: prompt.result.priorities,
    prompt: prompt.result.correctedPrompt,
  }),
);
await db.$disconnect();
