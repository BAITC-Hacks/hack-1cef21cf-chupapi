import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeWithProvider } from "../lib/ai-server.js";
import {
  demoDescription,
  generateQuestions,
  generateChallengeCard,
  demoInterviewAnswers,
} from "../lib/ai.js";
import { emptyCard } from "../lib/schema.js";
test("interview has exactly three grouped questions and preserves sample facts", () => {
  assert.equal(generateQuestions(demoDescription).length, 3);
  const card = generateChallengeCard(demoDescription, demoInterviewAnswers);
  assert.equal(card.title, "AI Queue Optimization");
  assert.ok(card.contact.includes("@"));
  assert.ok(card.successCriteria.includes("12"));
});
test("real provider adapter sends structured schema, grounds facts and accepts tailored questions", async () => {
  let sent;
  const result = await analyzeWithProvider(
    demoDescription,
    {},
    {
      apiKey: "unit-test-only",
      fetcher: async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        sent = JSON.parse(options.body);
        return Response.json({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    review: {
                      status: "approved",
                      summary: "Coherent problem; details can be clarified.",
                      issues: [],
                    },
                    card: {
                      ...emptyCard(),
                      problem: demoDescription,
                      data: "Fabricated dataset",
                    },
                    questions: generateQuestions(demoDescription),
                  }),
                },
              ],
            },
          ],
        });
      },
    },
  );
  assert.equal(sent.text.format.type, "json_schema");
  assert.equal(sent.store, false);
  assert.equal(result.mode, "REAL AI");
  assert.equal(result.analysis.card.data, null);
  assert.equal(result.analysis.questions.length, 3);
});
test("invalid provider output and rejected credentials use explicit fallback", async () => {
  for (const response of [
    () => Response.json({ output: [] }),
    () => new Response("", { status: 401 }),
    () => new Response("", { status: 429 }),
  ]) {
    const result = await analyzeWithProvider(
      demoDescription,
      {},
      { apiKey: "unit-test-only", fetcher: async () => response() },
    );
    assert.equal(result.mode, "MOCK AI");
    assert.equal(result.analysis.questions.length, 3);
  }
});
