import { db } from "../src/lib/db";
import { rememberBriefOptions } from "../src/lib/studio-option-store";
for (const brief of await db.studioBrief.findMany({
  select: { payload: true },
}))
  await rememberBriefOptions(brief.payload);
console.log(
  "Kayıtlı brieflerdeki özel seçenekler birleştirildi:",
  await db.studioOption.count(),
);
await db.$disconnect();
