import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../lib/database.js";
import {
  demoAnswers,
  demoDescription,
  generateChallengeCard,
} from "../lib/ai.js";
function challenge(id) {
  return {
    id,
    card: generateChallengeCard(demoDescription, demoAnswers),
    description: demoDescription,
    status: "confirmed",
    contentReview: {
      status: "approved",
      summary: "Relevant and consistent.",
      issues: [],
    },
    createdAt: new Date().toISOString(),
    initialScore: 8,
    interviewScore: 100,
    owner: "Database test",
  };
}
test("SQLite persists across reopen; publishing needs confirmation; proposals and decisions are shared", () => {
  const folder = mkdtempSync(join(tmpdir(), "challengehub-test-"));
  const path = join(folder, "test.sqlite");
  let db = createDatabase(path);
  try {
    assert.equal(db.snapshot().challenges.length, 10);
    const c = challenge("test");
    assert.throws(
      () => db.saveChallenge({ ...c, status: "published" }),
      /Confirm/,
    );
    db.saveChallenge(c);
    assert.throws(
      () =>
        db.saveChallenge({
          ...c,
          card: { ...c.card, title: "Changed" },
          status: "published",
        }),
      /Confirm/,
    );
    db.saveChallenge({ ...c, status: "published" });
    const p = {
      teamName: "Test team",
      idea: "A forecasting dashboard",
      plan: "Build and test a small prototype",
      duration: "2 weeks",
      link: "",
    };
    const saved = db.submitProposal(c.id, p, "stable-proposal");
    db.submitProposal(c.id, p, "stable-proposal");
    assert.equal(
      db.snapshot().proposals.filter((p) => p.id === saved.id).length,
      1,
    );
    db.decide(saved.id, "Accepted");
    db.close();
    db = createDatabase(path);
    assert.equal(
      db.snapshot().proposals.find((p) => p.id === saved.id).status,
      "Accepted",
    );
    assert.equal(
      db.snapshot().challenges.find((item) => item.id === c.id).status,
      "published",
    );
    assert.equal(db.snapshot().challenges.length, 11);
    assert.throws(() => db.submitProposal("draft-1", p), /not published/);
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
