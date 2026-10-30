import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
const db = new PrismaClient();
try {
  const source = JSON.parse(
    await readFile("data/knowledge/keyword-watchlist.json", "utf8"),
  );
  let added = 0;
  for (const k of source.keywords) {
    const data = {
      term: k.term,
      category: k.category,
      priority: k.priority,
      status: k.status || "active",
      reason: k.reason,
    };
    const result = await db.keywordWatch.createMany({
      data: [data],
      skipDuplicates: true,
    });
    added += result.count;
  }
  console.log(
    JSON.stringify({
      added,
      total: await db.keywordWatch.count(),
      preservedExisting: true,
    }),
  );
} finally {
  await db.$disconnect();
}
