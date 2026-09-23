import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { challengeSchema, proposalInputSchema, storeSchema } from "./schema.js";
import { seedDatabase } from "./seed.js";
import { isProvided } from "./readiness-score.js";

export class DatabaseError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function createDatabase(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  const sql = new DatabaseSync(filename);
  sql.exec(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
  );
  sql.exec(`
 CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('draft','confirmed','published')), content TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, challenge_id TEXT NOT NULL REFERENCES challenges(id), content TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS proposal_challenge ON proposals(challenge_id);
 CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
 `);
  function transaction(fn) {
    sql.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      sql.exec("COMMIT");
      return result;
    } catch (error) {
      sql.exec("ROLLBACK");
      throw error;
    }
  }
  const insertChallenge = sql.prepare(
    "INSERT OR IGNORE INTO challenges(id,status,content) VALUES(?,?,?)",
  );
  const insertProposal = sql.prepare(
    "INSERT OR IGNORE INTO proposals(id,challenge_id,content) VALUES(?,?,?)",
  );
  transaction(() => {
    if (!sql.prepare("SELECT value FROM metadata WHERE key='seed'").get()) {
      const seed = seedDatabase();
      for (const c of seed.challenges)
        insertChallenge.run(c.id, c.status, JSON.stringify(c));
      for (const p of seed.proposals)
        insertProposal.run(p.id, p.challengeId, JSON.stringify(p));
      sql.prepare("INSERT INTO metadata(key,value) VALUES('seed','1')").run();
    }
  });
  const readChallenge = (id) => {
    const row = sql
      .prepare("SELECT content FROM challenges WHERE id=?")
      .get(id);
    return row ? JSON.parse(row.content) : null;
  };
  function snapshot() {
    return storeSchema.parse({
      version: 1,
      challenges: sql
        .prepare("SELECT content FROM challenges ORDER BY rowid DESC")
        .all()
        .map((r) => JSON.parse(r.content)),
      proposals: sql
        .prepare("SELECT content FROM proposals ORDER BY rowid DESC")
        .all()
        .map((r) => JSON.parse(r.content)),
    });
  }
  function saveChallenge(input) {
    const c = challengeSchema.parse(input);
    return transaction(() => {
      const current = readChallenge(c.id);
      if (
        c.status !== "draft" &&
        (!isProvided(c.card.title) || !isProvided(c.card.problem))
      )
        throw new DatabaseError(
          "Add a title and business problem before confirming.",
        );
      if (
        c.status === "published" &&
        (!current ||
          current.status !== "confirmed" ||
          current.contentReview?.status !== "approved" ||
          current.description !== c.description ||
          JSON.stringify(current.card) !== JSON.stringify(c.card))
      )
        throw new DatabaseError(
          "Confirm this exact card before publishing.",
          409,
        );
      const saved = {
        ...c,
        contentReview:
          c.status === "published" ? current.contentReview : c.contentReview,
        createdAt: current?.createdAt ?? new Date().toISOString(),
      };
      sql
        .prepare(
          "INSERT INTO challenges(id,status,content) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,content=excluded.content",
        )
        .run(saved.id, saved.status, JSON.stringify(saved));
      return saved;
    });
  }
  function submitProposal(
    challengeId,
    input,
    id = randomUUID(),
    contentReview,
  ) {
    const proposal = proposalInputSchema.parse(input);
    return transaction(() => {
      const challenge = readChallenge(challengeId);
      if (!challenge || challenge.status !== "published")
        throw new DatabaseError("Challenge is not published.", 404);
      const existing = sql
        .prepare("SELECT content FROM proposals WHERE id=?")
        .get(id);
      if (existing) return JSON.parse(existing.content);
      const saved = {
        ...proposal,
        contentReview,
        id,
        challengeId,
        submittedBy: "demo-student",
        status: "Pending",
        createdAt: new Date().toISOString(),
      };
      insertProposal.run(saved.id, challengeId, JSON.stringify(saved));
      return saved;
    });
  }
  function decide(id, status) {
    if (!["Accepted", "Rejected"].includes(status))
      throw new DatabaseError("Choose Accepted or Rejected.");
    return transaction(() => {
      const row = sql
        .prepare("SELECT content FROM proposals WHERE id=?")
        .get(id);
      if (!row) throw new DatabaseError("Proposal not found.", 404);
      const saved = { ...JSON.parse(row.content), status };
      sql
        .prepare("UPDATE proposals SET content=? WHERE id=?")
        .run(JSON.stringify(saved), id);
      return saved;
    });
  }
  function importLegacy(input) {
    const legacy = storeSchema.parse(input);
    return transaction(() => {
      let count = 0;
      for (const c of legacy.challenges)
        if (!c.id.startsWith("challenge-") && !c.id.startsWith("draft-"))
          count += Number(
            insertChallenge.run(
              c.id,
              "draft",
              JSON.stringify({
                ...c,
                status: "draft",
                contentReview: undefined,
              }),
            ).changes,
          );
      // Legacy proposals stay in the browser backup until reviewed and resubmitted.
      return count;
    });
  }
  return {
    snapshot,
    saveChallenge,
    submitProposal,
    decide,
    importLegacy,
    close: () => sql.close(),
  };
}
export function getDatabase() {
  const path = resolve(
    /* turbopackIgnore: true */
    process.env.DATABASE_PATH || "./data/challengehub.sqlite",
  );
  globalThis.__challengehubDatabases ??= new Map();
  if (!globalThis.__challengehubDatabases.has(path))
    globalThis.__challengehubDatabases.set(path, createDatabase(path));
  return globalThis.__challengehubDatabases.get(path);
}
