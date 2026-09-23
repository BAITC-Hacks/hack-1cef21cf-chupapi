import { reviewSchema } from "./schema.js";
export const REVIEW_PURPOSE =
  "AI checks meaning, relevance and consistency. Business facts are supplied by the author, not independently verified.";
export function unavailableReview() {
  return {
    status: "unavailable",
    summary:
      "AI review is unavailable. You can save a draft, but confirmation, publication and proposal submission require a successful review.",
    issues: [],
  };
}
export function normalizeReview(value) {
  const review = reviewSchema.parse(value);
  for (const issue of review.issues)
    if (["missing_detail", "unverified"].includes(issue.kind))
      issue.severity = "warning";
  if (
    review.issues.length &&
    review.issues.every((i) => i.severity === "warning") &&
    review.status !== "unavailable"
  )
    review.status = "approved";
  if (review.issues.some((i) => i.severity === "blocking"))
    review.status = "needs_clarification";
  if (review.status === "needs_clarification" && !review.issues.length)
    review.issues.push({
      field: "description",
      kind: "irrelevant",
      reason: review.summary,
      suggestion:
        "Describe a concrete problem, who is affected and what needs to change.",
      severity: "blocking",
    });
  return review;
}
export function basicReview(description, values = {}) {
  const russian = /[а-яё]/i.test(description);
  const issues = [];
  const samples = { description, ...values };
  for (const [field, value] of Object.entries(samples)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const s = value.trim();
    const words = s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const obvious =
      /^(?:asdf\w*|qwert\w*|zxcv\w*|фыва\p{L}*|йцук\p{L}*|абвгд\p{L}*|blah|бла|лол|12345\d*)$/iu;
    const junk =
      /(.)\1{6,}/u.test(s) ||
      !/[\p{L}\p{N}]/u.test(s) ||
      (words.length > 0 && words.every((w) => obvious.test(w))) ||
      (words.length >= 8 && new Set(words).size <= 2);
    const tooShort =
      field === "description" && (words.length < 3 || s.length < 12);
    if (junk || tooShort)
      issues.push({
        field,
        kind: junk ? "gibberish" : "irrelevant",
        reason: russian
          ? "Текст не описывает понятную задачу или содержит случайные символы."
          : "This text does not describe a clear task, or contains random/repeated characters.",
        suggestion: russian
          ? "Напишите своими словами: что происходит, кому мешает и что нужно улучшить."
          : "Use a concrete sentence: what is happening, who is affected and what should improve.",
        severity: "blocking",
      });
  }
  return issues.length
    ? {
        status: "needs_clarification",
        summary: russian
          ? "Сначала уточните ввод — пока нельзя подготовить релевантную карточку."
          : "Please clarify the input before continuing.",
        issues,
      }
    : null;
}
