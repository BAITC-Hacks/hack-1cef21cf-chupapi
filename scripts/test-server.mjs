// Local provider fixture for browser tests only. No real API requests.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { generateChallengeCard, generateQuestions } from "../lib/ai.js";
import { basicReview } from "../lib/content-quality.js";
const fixture = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  const input = JSON.parse(body.input);
  let review = basicReview(
    input.description,
    input.answers ?? input.proposal ?? input.card ?? {},
  ) ?? {
    status: "approved",
    summary: "The supplied content is relevant and internally consistent.",
    issues: [],
  };
  if (JSON.stringify(input).includes("purple bananas")) {
    review = {
      status: "needs_clarification",
      summary: "The answer is unrelated to the business problem.",
      issues: [
        {
          field: "outcome",
          kind: "irrelevant",
          reason: "This does not describe a solution to the queue problem.",
          suggestion: "Describe a result that reduces waiting times.",
          severity: "blocking",
        },
      ],
    };
  }
  const value = body.text.format.schema.properties.review
    ? {
        review,
        card: generateChallengeCard(input.description, input.answers ?? {}),
        questions: generateQuestions(input.description),
      }
    : review;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(value) }] },
      ],
    }),
  );
});
fixture.listen(0, "127.0.0.1", () => {
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        OPENAI_API_KEY: "local-fixture-only",
        OPENAI_BASE_URL: "http://127.0.0.1:" + fixture.address().port + "/v1",
      },
    },
  );
  child.on("exit", (code) => {
    fixture.close();
    process.exit(code ?? 0);
  });
  for (const event of ["SIGTERM", "SIGINT"])
    process.on(event, () => {
      child.kill();
      fixture.close();
    });
});
