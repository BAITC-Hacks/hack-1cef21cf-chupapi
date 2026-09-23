import { z } from "zod";
import { getDatabase, DatabaseError } from "@/lib/database";
import { reviewContent } from "@/lib/ai-server";
import {
  challengeSchema,
  proposalInputSchema,
  storeSchema,
} from "@/lib/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveChallenge"), challenge: challengeSchema }),
  z.object({
    action: z.literal("submitProposal"),
    id: z.string().uuid(),
    challengeId: z.string().min(1),
    proposal: proposalInputSchema,
  }),
  z.object({
    action: z.literal("decide"),
    id: z.string().min(1),
    status: z.enum(["Accepted", "Rejected"]),
  }),
  z.object({ action: z.literal("importLegacy"), data: storeSchema }),
]);
export async function GET() {
  try {
    return Response.json(getDatabase().snapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Database unavailable. Check server storage permissions." },
      { status: 503 },
    );
  }
}
export async function POST(request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      return Response.json(
        { error: "Cross-origin changes are not allowed." },
        { status: 403 },
      );
    const raw = await request.text();
    if (raw.length > 2000000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const input = actionSchema.parse(JSON.parse(raw));
    // Demo role, not authentication. Replace with a real session before public deployment.
    const role = request.headers.get("x-demo-role");
    const required = input.action === "submitProposal" ? "Student" : "Business";
    if (role !== required)
      return Response.json(
        { error: "Switch to " + required + " to perform this action." },
        { status: 403 },
      );
    const db = getDatabase();
    const reviewOptions = {
      locale: ["ru", "kk", "en"].includes(request.headers.get("x-ui-locale"))
        ? request.headers.get("x-ui-locale")
        : "ru",
    };
    if (input.action === "saveChallenge") {
      const challenge = { ...input.challenge };
      delete challenge.contentReview;
      if (challenge.status === "confirmed") {
        const review = await reviewContent(
          {
            description: challenge.description,
            card: challenge.card,
          },
          reviewOptions,
        );
        if (review.status !== "approved")
          return Response.json(
            { error: review.summary, review },
            { status: review.status === "unavailable" ? 503 : 422 },
          );
        challenge.contentReview = review;
      }
      db.saveChallenge(challenge);
    }
    if (input.action === "submitProposal") {
      const challenge = db
        .snapshot()
        .challenges.find(
          (c) => c.id === input.challengeId && c.status === "published",
        );
      if (!challenge)
        return Response.json(
          { error: "Challenge not found." },
          { status: 404 },
        );
      const review = await reviewContent(
        {
          description: challenge.card.problem || challenge.description,
          card: challenge.card,
          proposal: input.proposal,
        },
        reviewOptions,
      );
      if (review.status !== "approved")
        return Response.json(
          { error: review.summary, review },
          { status: review.status === "unavailable" ? 503 : 422 },
        );
      db.submitProposal(input.challengeId, input.proposal, input.id, review);
    }
    if (input.action === "decide") db.decide(input.id, input.status);
    if (input.action === "importLegacy") db.importLegacy(input.data);
    return Response.json(db.snapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: error.issues[0]?.message || "Invalid data." },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    if (error instanceof DatabaseError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json(
      { error: "Could not save to the database. Please retry." },
      { status: 503 },
    );
  }
}
