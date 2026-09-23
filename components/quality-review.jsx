"use client";

import { useLocale } from "@/components/locale";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { fieldLabels, interviewLabels } from "@/lib/schema";
export function QualityReview({ review }) {
  const { t } = useLocale();
  if (!review) return null;
  const approved = review.status === "approved";
  return (
    <section
      className={"quality-review " + (approved ? "approved" : "needs-review")}
      role={approved ? "status" : "alert"}
      data-testid="quality-review"
    >
      <h3>
        {t(approved ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />)}
        {t(" ")}
        {t(
          approved
            ? "AI relevance check completed"
            : review.status === "unavailable"
              ? "AI review unavailable"
              : "Please clarify before continuing",
        )}
      </h3>
      <p>{t(review.summary)}</p>
      {t(
        review.issues.length > 0 && (
          <ul>
            {review.issues.map((issue, i) => (
              <li key={i}>
                <strong>
                  {fieldLabels[issue.field] ||
                    interviewLabels[issue.field] ||
                    issue.field}
                  :{" "}
                </strong>
                {issue.reason}
                <span>{issue.suggestion}</span>
              </li>
            ))}
          </ul>
        ),
      )}
      <small>
        <ShieldCheck size={14} />
        {t(
          "Checks meaning, relevance and consistency \u2014 not the truth of company claims.",
        )}
      </small>
    </section>
  );
}
