import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateReadinessScore,
  scoreWeights,
} from "../lib/readiness-score.js";
import {
  emptyCard,
  cardSchema,
  fields,
  proposalInputSchema,
} from "../lib/schema.js";
import {
  analyzeChallenge,
  demoAnswers,
  demoDescription,
  generateChallengeCard,
  groundedCard,
} from "../lib/ai.js";
import { seedDatabase } from "../lib/seed.js";
test("exact scoring weights sum to 100; empty input scores zero", () => {
  assert.equal(
    Object.values(scoreWeights).reduce((a, b) => a + b, 0),
    100,
  );
  assert.equal(calculateReadinessScore(emptyCard()).total, 0);
});
test("complete demo reaches 100; removing facts lowers score", () => {
  const card = generateChallengeCard(demoDescription, demoAnswers);
  assert.equal(calculateReadinessScore(card).total, 100);
  assert.equal(calculateReadinessScore({ ...card, data: null }).total, 80);
  assert.equal(
    calculateReadinessScore({ ...card, contact: null, collaboration: null })
      .total,
    90,
  );
});
test("weak coffee description generates relevant questions without invented facts", () => {
  const result = analyzeChallenge(demoDescription);
  assert.ok(result.questions.length >= 3);
  assert.ok(
    result.questions.some(
      (q) => q.field === "resources" && q.question.includes("waiting"),
    ),
  );
  assert.equal(result.card.data, null);
  assert.equal(result.card.contact, null);
  assert.equal(result.card.context, null);
  assert.equal(result.card.problem, demoDescription);
  assert.ok(calculateReadinessScore(result.card).total < 40);
});
test("grounding discards fabricated values", () => {
  const candidate = {
    ...emptyCard(),
    data: "six months of invented data",
    problem: demoDescription,
  };
  const safe = groundedCard(candidate, demoDescription, {});
  assert.equal(safe.data, null);
  assert.equal(safe.problem, demoDescription);
});
test("scoring is bounded and deterministic", () => {
  for (let n = 0; n < 140; n++) {
    const card = cardSchema.parse(
      Object.fromEntries(fields.map((f) => [f, "1".repeat(n)])),
    );
    const score = calculateReadinessScore(card);
    assert.ok(score.total >= 0 && score.total <= 100);
    assert.deepEqual(score, calculateReadinessScore(card));
    assert.equal(
      score.level,
      score.total >= 90
        ? "Priority"
        : score.total >= 70
          ? "Ready"
          : score.total >= 40
            ? "Workable"
            : "Draft",
    );
  }
});
test("seed has 5 drafts, 5 published cards, 5 proposals and 5 teams", () => {
  const db = seedDatabase();
  assert.equal(db.challenges.filter((c) => c.status === "draft").length, 5);
  assert.equal(db.challenges.filter((c) => c.status === "published").length, 5);
  assert.equal(db.proposals.length, 5);
  assert.equal(new Set(db.proposals.map((p) => p.teamName)).size, 5);
  const levels = new Set(
    db.challenges
      .filter((c) => c.status === "published")
      .map((c) => calculateReadinessScore(c.card).level),
  );
  assert.ok(levels.has("Draft"));
  assert.ok(levels.has("Priority"));
});
test("malformed cards and unsafe links fail validation", () => {
  assert.equal(cardSchema.safeParse({ data: 42 }).success, false);
  assert.equal(
    proposalInputSchema.safeParse({
      teamName: "A",
      idea: "Long enough idea",
      plan: "Long enough plan",
      duration: "2 weeks",
      link: "javascript:alert(1)",
    }).success,
    false,
  );
});
