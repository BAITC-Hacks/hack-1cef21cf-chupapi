import nextEnv from "@next/env";
import { analyzeWithProvider, reviewContent } from "../lib/ai-server.js";
import {
  demoDescription,
  demoInterviewAnswers,
  generateChallengeCard,
} from "../lib/ai.js";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const irrelevant = await analyzeWithProvider(demoDescription, {
  outcome: "Yesterday I watched a comedy film and ate popcorn.",
  resources: "Six months of order timestamps are available.",
  people: "Managers will use the solution.",
});
const coherent = await analyzeWithProvider(
  demoDescription,
  demoInterviewAnswers,
);
const contradictions = await reviewContent({
  description: demoDescription,
  card: {
    ...generateChallengeCard(demoDescription, demoInterviewAnswers),
    constraints:
      "The final deliverable must be ready within 2 weeks. The deadline is 8 weeks and no earlier delivery is allowed.",
  },
});
console.log(
  JSON.stringify(
    {
      irrelevant: { mode: irrelevant.mode, review: irrelevant.review },
      coherent: {
        mode: coherent.mode,
        review: coherent.review,
        successCriteria: coherent.analysis.card.successCriteria,
      },
      contradictions,
    },
    null,
    2,
  ),
);
if (
  irrelevant.review.status !== "needs_clarification" ||
  coherent.review.status !== "approved" ||
  contradictions.status !== "needs_clarification"
)
  process.exitCode = 1;
