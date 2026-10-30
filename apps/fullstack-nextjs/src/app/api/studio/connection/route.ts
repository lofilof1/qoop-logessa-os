import {
  imageKey,
  imageModel,
  localMutation,
  saveImageKey,
  providerMessage,
} from "@/lib/image-connection";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(
      { configured: !!(await imageKey()), model: imageModel },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ configured: false, model: imageModel });
  }
}
export async function POST(r: Request) {
  try {
    localMutation(r);
    const { apiKey } = z
      .object({ apiKey: z.string().trim().min(20).max(512) })
      .parse(await r.json());
    const check = await fetch(
      "https://api.openai.com/v1/models/" + imageModel,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!check.ok)
      return Response.json(
        { error: providerMessage(check.status) },
        { status: 400 },
      );
    await saveImageKey(apiKey);
    return Response.json({ configured: true, model: imageModel });
  } catch {
    return Response.json(
      {
        error:
          "Bağlantı doğrulanamadı. Anahtarı ve internet bağlantısını kontrol et.",
      },
      { status: 400 },
    );
  }
}
