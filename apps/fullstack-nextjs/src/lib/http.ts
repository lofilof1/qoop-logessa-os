import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
export function failure(e: unknown) {
  if (e instanceof ZodError)
    return Response.json(
      { error: e.issues.map((x) => x.message).join("; ") },
      { status: 400 },
    );
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return Response.json({ error: "Bu kod zaten kayıtlı." }, { status: 409 });
  console.error(e);
  return Response.json(
    { error: "İşlem tamamlanamadı. Servisleri ve girdileri kontrol edin." },
    { status: 500 },
  );
}
