import watchlist from "../data/knowledge/keyword-watchlist.json";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  await db.keywordWatch.createMany({data:watchlist.keywords.map(k=>({term:k.term,category:k.category,priority:k.priority,status:k.status,reason:k.reason})),skipDuplicates:true});
  const d = await db.design.upsert({
    where: { code: "QP-0001" },
    update: {},
    create: {
      code: "QP-0001",
      title: "Sessiz Bahçe",
      description:
        "Sprint 1 örnek tasarım kaydı. Master dosya henüz yüklenmedi.",
    },
  });
  await db.sku.upsert({
    where: { code: "QP-0001-01" },
    update: {},
    create: {
      designId: d.id,
      code: "QP-0001-01",
      label: "Duvar kağıdı · Ana renk",
    },
  });
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
