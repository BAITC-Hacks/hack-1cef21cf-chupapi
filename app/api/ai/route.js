import { z } from "zod";
import { analyzeWithProvider } from "@/lib/ai-server";
import { answerKeys } from "@/lib/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const inputSchema = z.object({
  locale: z.enum(["ru", "kk", "en"]).default("ru"),
  description: z.string().trim().min(1).max(6000),
  answers: z
    .partialRecord(z.enum(answerKeys), z.string().max(6000))
    .default({}),
});
export async function GET() {
  return Response.json(
    {
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      provider: "OpenAI",
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request) {
  try {
    const raw = await request.text();
    if (raw.length > 90000)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    const input = inputSchema.safeParse(JSON.parse(raw));
    if (!input.success)
      return Response.json(
        { error: "Please provide a description and valid answers." },
        { status: 400 },
      );
    return Response.json(
      await analyzeWithProvider(input.data.description, input.data.answers, {
        locale: input.data.locale,
      }),
    );
  } catch {
    return Response.json({ error: "Invalid request JSON." }, { status: 400 });
  }
}
