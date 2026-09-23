import { test } from "node:test";
import assert from "node:assert/strict";
import { basicReview, normalizeReview } from "../lib/content-quality.js";
import { analyzeWithProvider, reviewContent } from "../lib/ai-server.js";
import { demoDescription, generateQuestions } from "../lib/ai.js";
import { emptyCard } from "../lib/schema.js";
const response = (value) => async () =>
  Response.json({
    output: [
      { content: [{ type: "output_text", text: JSON.stringify(value) }] },
    ],
  });
test("missing details remain warnings rather than blocking coherent briefs", () => {
  const review = normalizeReview({
    status: "needs_clarification",
    summary: "Please provide available datasets.",
    issues: [{ field: "data", kind: "missing_detail", reason: "Data is unspecified.", suggestion: "Describe available records.", severity: "blocking" }],
  });
  assert.equal(review.status, "approved");
  assert.equal(review.issues[0].severity, "warning");
});
test("random characters and repetitions are blocked; coherent short multilingual briefs are allowed", () => {
  for (const value of [
    "asdfgh qwerty zxcvbn",
    "фывапрол фывапрол фывапрол",
    "!!!!!!!",
    "lol lol lol lol lol lol lol lol",
  ])
    assert.equal(basicReview(value).status, "needs_clarification");
  for (const value of [
    demoDescription,
    "В нашем кафе большие очереди.",
    "Improve our website checkout.",
  ])
    assert.equal(basicReview(value), null);
});
test("irrelevant answers cause clarification, not a generated card", async () => {
  const review = {
    status: "approved",
    summary: "The answer is unrelated.",
    issues: [
      {
        field: "outcome",
        kind: "irrelevant",
        reason: "Does not address queues.",
        suggestion: "Describe a waiting-time improvement.",
        severity: "blocking",
      },
    ],
  };
  const result = await analyzeWithProvider(
    demoDescription,
    { outcome: "Purple bananas dance on Jupiter." },
    {
      apiKey: "test",
      fetcher: response({
        review,
        card: { ...emptyCard(), title: "Invented" },
        questions: generateQuestions(demoDescription),
      }),
    },
  );
  assert.equal(result.review.status, "needs_clarification");
  assert.equal(result.analysis.card.title, null);
});
test("a provider failure cannot become a successful review", async () => {
  const review = await reviewContent(
    { description: demoDescription, card: emptyCard() },
    { apiKey: "test", fetcher: async () => new Response("", { status: 503 }) },
  );
  assert.equal(review.status, "unavailable");
  assert.equal(
    normalizeReview({
      status: "needs_clarification",
      summary: "Please clarify.",
      issues: [],
    }).issues.length,
    1,
  );
});
test("proposal review includes business requirements and never selects a team", async () => {
  let payload;
  const approved = {
    status: "approved",
    summary: "Proposal addresses the queue problem.",
    issues: [],
  };
  const result = await reviewContent(
    {
      description: demoDescription,
      card: { ...emptyCard(), constraints: "Four weeks" },
      proposal: {
        idea: "Build a forecast dashboard",
        plan: "Analyze orders and run a pilot",
      },
    },
    {
      apiKey: "test",
      fetcher: async (_url, options) => {
        payload = JSON.parse(options.body);
        return response(approved)();
      },
    },
  );
  assert.equal(result.status, "approved");
  assert.ok(payload.instructions.includes("Do not rank or choose teams"));
  assert.equal(JSON.parse(payload.input).card.constraints, "Four weeks");
});
