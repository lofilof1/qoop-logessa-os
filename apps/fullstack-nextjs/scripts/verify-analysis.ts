import { db } from "../src/lib/db";
const root = "http://127.0.0.1:3000";
try {
  const a = await db.imageAnalysis.findFirst({
    where: { reviewJobId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!a)
    throw Error(
      "Önce gerçek bir görsel yükleyip analizini tamamla; doğrulama test görseliyle model kullanımı başlatmaz.",
    );
  const before = await db.analysisReviewJob.findUniqueOrThrow({
    where: { id: a.reviewJobId! },
  });
  if (before.state !== "SUCCEEDED")
    throw Error("Gerçek görselin analizi henüz tamamlanmadı.");
  const r = await fetch(root + `/api/analysis/${a.id}/run`, {
    method: "POST",
    headers: { Origin: root, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!r.ok) throw Error("Analiz durum API hatası.");
  const data = await r.json();
  if (
    data.job.id !== before.id ||
    data.job.state !== "SUCCEEDED" ||
    !data.job.result?.correctedPrompt
  )
    throw Error("Kayıtlı sonuç bulunamadı.");
  const after = await db.analysisReviewJob.findUniqueOrThrow({
    where: { id: before.id },
  });
  if (
    after.startedAt?.getTime() !== before.startedAt?.getTime() ||
    after.finishedAt?.getTime() !== before.finishedAt?.getTime()
  )
    throw Error("Kayıtlı sonuç tekrar çalıştırıldı.");
  console.log(
    "PASS gerçek görsel raporu, düzeltilmiş prompt, kayıtlı sonucu yeni model çağrısı olmadan kullanma; servis:",
    data.worker.online ? "hazır" : "kapalı",
  );
} finally {
  await db.$disconnect();
}
