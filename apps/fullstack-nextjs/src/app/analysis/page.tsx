import Link from "next/link";
import { pageNumber } from "@/lib/efficiency";
import { db } from "@/lib/db";
import { ImageAnalysis } from "@/components/image-analysis";
export const dynamic = "force-dynamic";
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = pageNumber((await searchParams).page);
  const total = await db.imageAnalysis.count();
  const pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(requested, pages);
  const records = await db.imageAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    skip: (page - 1) * 20,
    select: { id: true },
  });
  return (
    <>
      <header>
        <h1>Tasarım analizi</h1>
        <p>Görselini yükle; düzeltme raporu ve üretim promptlarını al.</p>
      </header>
      <ImageAnalysis
        records={records.map((r, i) => ({
          ...r,
          sequence: total - (page - 1) * 20 - i,
        }))}
      />
      {pages > 1 && (
        <nav className="pagination" aria-label="Analiz geçmişi sayfaları">
          {page > 1 ? (
            <Link href={`/analysis?page=${page - 1}`}>← Daha yeni</Link>
          ) : (
            <span />
          )}
          <span>
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`/analysis?page=${page + 1}`}>Daha eski →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
