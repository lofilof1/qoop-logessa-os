import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Import() {
  const designs = await db.design.findMany({ orderBy: { code: "asc" } });
  return (
    <>
      <header>
        <p>KAYNAK ARŞİVİ</p>
        <h1>Midjourney import</h1>
        <p>
          Metadata eklemek için bir tasarım seç. JSON içeriği kaynak kaydıyla
          birlikte saklanır.
        </p>
      </header>
      <section>
        {designs.map((d) => (
          <Link className="row" key={d.id} href={`/designs/${d.id}`}>
            <span>{d.code}</span>
            <b>{d.title}</b>
            <span>Metadata ekle →</span>
          </Link>
        ))}
        {!designs.length && (
          <Link href="/designs">Önce bir tasarım oluştur →</Link>
        )}
      </section>
    </>
  );
}
