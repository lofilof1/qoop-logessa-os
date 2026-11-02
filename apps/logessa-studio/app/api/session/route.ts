import { getChatGPTUser } from "@/app/chatgpt-auth";
import { result } from "@/lib/server";
import { env } from "cloudflare:workers";
export async function GET() { const u = await getChatGPTUser(); return result({ user: u ? { name: u.fullName || u.displayName } : null, aluraConfigured: !!env.ALURA_API_KEY, aiConfigured: !!env.OPENAI_API_KEY }); }
