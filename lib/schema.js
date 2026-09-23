import { z } from "zod";
export const fieldLabels = {
  title: "Title",
  industry: "Industry",
  context: "Business context",
  problem: "Business need / problem",
  users: "Users",
  data: "Available data & materials",
  constraints: "Constraints",
  expectedResult: "Expected result",
  successCriteria: "Success criteria",
  contact: "Business contact",
  collaboration: "Collaboration format",
  skills: "Relevant skills",
};
const text = z.string().max(6000).nullable();
export const cardSchema = z.object({
  title: text,
  industry: text,
  context: text,
  problem: text,
  users: text,
  data: text,
  constraints: text,
  expectedResult: text,
  successCriteria: text,
  contact: text,
  collaboration: text,
  skills: text,
});
export const fields = Object.keys(fieldLabels);
export const emptyCard = () => Object.fromEntries(fields.map((f) => [f, null]));
export const interviewLabels = {
  outcome: "Result & success",
  resources: "Data & constraints",
  people: "Users & collaboration",
};
export const answerKeys = [...fields, ...Object.keys(interviewLabels)];
export const questionSchema = z.object({
  field: z.enum(Object.keys(interviewLabels)),
  question: z.string().min(5).max(500),
});
export const reviewSchema = z.object({
  status: z.enum(["approved", "needs_clarification", "unavailable"]),
  summary: z.string().min(1).max(1200),
  issues: z
    .array(
      z.object({
        field: z.string().min(1).max(80),
        kind: z.enum([
          "gibberish",
          "irrelevant",
          "contradiction",
          "instruction",
          "missing_detail",
          "unverified",
        ]),
        reason: z.string().min(1).max(600),
        suggestion: z.string().min(1).max(600),
        severity: z.enum(["blocking", "warning"]),
      }),
    )
    .max(20),
});
export const aiResultSchema = z.object({
  mode: z.enum(["REAL AI", "MOCK AI"]),
  reason: z.string(),
  review: reviewSchema,
  analysis: z.object({
    card: cardSchema,
    missingFields: z.array(z.enum(fields)),
    questions: z.array(questionSchema).length(3),
  }),
});
export const analysisSchema = z.object({
  card: cardSchema,
  missingFields: z.array(z.enum(fields)),
  questions: z.array(questionSchema).length(3),
});
export const challengeSchema = z.object({
  contentReview: reviewSchema.optional(),
  id: z.string(),
  card: cardSchema,
  description: z.string(),
  status: z.enum(["draft", "confirmed", "published"]),
  createdAt: z.string(),
  initialScore: z.number(),
  interviewScore: z.number(),
  owner: z.string(),
});
export const proposalInputSchema = z.object({
  teamName: z.string().trim().min(1, "Team name is required.").max(100),
  idea: z
    .string()
    .trim()
    .min(10, "Describe your solution idea in at least 10 characters.")
    .max(3000),
  plan: z
    .string()
    .trim()
    .min(10, "Add an implementation plan (at least 10 characters).")
    .max(5000),
  duration: z
    .string()
    .trim()
    .min(1, "Estimated duration is required.")
    .max(100),
  link: z.union([
    z.literal(""),
    z
      .url()
      .refine((v) => /^https?:\/\//i.test(v), "Use an http or https link."),
  ]),
});
export const proposalSchema = proposalInputSchema.extend({
  contentReview: reviewSchema.optional(),
  submittedBy: z.string().optional(),
  id: z.string(),
  challengeId: z.string(),
  status: z.enum(["Pending", "Accepted", "Rejected"]),
  createdAt: z.string(),
});
export const storeSchema = z.object({
  version: z.literal(1),
  challenges: z.array(challengeSchema),
  proposals: z.array(proposalSchema),
});
