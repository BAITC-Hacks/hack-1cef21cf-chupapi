import { fieldLabels } from "./schema.js";
export const scoreWeights = {
  context: 20,
  data: 20,
  expectedResult: 15,
  successCriteria: 15,
  constraints: 10,
  users: 10,
  businessConnection: 10,
};
export const scoreLabels = {
  context: "Context & need",
  data: "Data & materials",
  expectedResult: "Expected result",
  successCriteria: "Success criteria",
  constraints: "Constraints",
  users: "Users",
  businessConnection: "Business connection",
};
export function isProvided(value) {
  const s = value?.trim() ?? "";
  return (
    s.length >= 3 &&
    !/^(unknown|n\/?a|tbd|none|not sure|missing|to be decided|to be confirmed|no data|нет|не знаю)[.!]?$/i.test(
      s,
    )
  );
}
export function quality(value, max) {
  if (!isProvided(value)) return 0;
  const n = value.trim().length;
  return Math.round(max * (n >= 80 ? 1 : n >= 40 ? 0.8 : n >= 20 ? 0.6 : 0.4));
}
export function calculateReadinessScore(card) {
  const breakdown = {
    context: quality(card.context, 10) + quality(card.problem, 10),
    data: quality(card.data, 20),
    expectedResult: quality(card.expectedResult, 15),
    successCriteria:
      quality(card.successCriteria, 10) +
      (isProvided(card.successCriteria) && /\d/.test(card.successCriteria)
        ? 5
        : 0),
    constraints: quality(card.constraints, 10),
    users: quality(card.users, 10),
    businessConnection:
      quality(card.contact, 5) + quality(card.collaboration, 5),
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const required = [
    "title",
    "context",
    "problem",
    "users",
    "data",
    "constraints",
    "expectedResult",
    "successCriteria",
    "contact",
    "collaboration",
  ];
  return {
    total,
    breakdown,
    missingFields: required
      .filter((f) => !isProvided(card[f]))
      .map((f) => fieldLabels[f]),
    level:
      total >= 90
        ? "Priority"
        : total >= 70
          ? "Ready"
          : total >= 40
            ? "Workable"
            : "Draft",
  };
}
export function improvementSuggestions(card) {
  const s = calculateReadinessScore(card);
  const out = [];
  if (s.breakdown.context < 20)
    out.push(
      "Describe the business context and the specific problem, including who is affected.",
    );
  if (s.breakdown.data < 20)
    out.push(
      "Explain what data students can access: its source, format, coverage and anonymization.",
    );
  if (s.breakdown.expectedResult < 15)
    out.push("Specify the deliverable and how the business will use it.");
  if (s.breakdown.successCriteria < 15)
    out.push(
      "Add measurable success criteria: a numeric target, baseline and a way to evaluate it.",
    );
  if (s.breakdown.constraints < 10)
    out.push(
      "Describe the timeline, budget, technical and privacy constraints.",
    );
  if (s.breakdown.users < 10)
    out.push(
      "Identify the people who will use the solution and their workflow.",
    );
  if (s.breakdown.businessConnection < 10)
    out.push(
      "Add a business contact and explain the consultation channel and frequency.",
    );
  return out;
}
