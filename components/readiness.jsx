"use client";
import {
  calculateReadinessScore,
  improvementSuggestions,
  scoreLabels,
  scoreWeights,
} from "@/lib/readiness-score";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Sparkles,
  Stethoscope,
} from "lucide-react";
export function Badge({ score }) {
  const level =
    score >= 90
      ? "Priority"
      : score >= 70
        ? "Ready"
        : score >= 40
          ? "Workable"
          : "Draft";
  return (
    <span className={"badge " + level.toLowerCase()}>
      <span />
      {level}
    </span>
  );
}
export function ReadinessPanel({ card, initialScore, onImprove }) {
  const score = calculateReadinessScore(card);
  const suggestions = improvementSuggestions(card);
  return (
    <>
      <section className="rail-card score-panel">
        <div className="row-between">
          <span className="tiny-label">TASK READINESS</span>
          <CircleHelp size={16} className="muted" />
        </div>
        <div className="score-ring" style={{ "--score": score.total }}>
          <div>
            <strong aria-live="polite" data-testid="readiness-score">
              {score.total}
              <small>/100</small>
            </strong>
            <Badge score={score.total} />
          </div>
        </div>
        <p className="score-caption">
          Completeness score · relevance is reviewed separately by AI.
        </p>
        {initialScore !== undefined && score.total > initialScore && (
          <div className="score-gain">
            <ArrowUpRight size={16} /> +{score.total - initialScore} readiness
            since your first draft
          </div>
        )}
        <div className="breakdown">
          {Object.entries(score.breakdown).map(([k, value]) => (
            <div key={k}>
              <div className="row-between">
                <span>{scoreLabels[k]}</span>
                <b>
                  {value}
                  <em> / {scoreWeights[k]}</em>
                </b>
              </div>
              <div className="mini-track">
                <span
                  style={{ width: (value / scoreWeights[k]) * 100 + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
        <details className="score-details">
          <summary>Transparent scoring rules</summary>
          <p>
            Each field earns 0 for missing information, then 40%, 60%, 80% or
            100% for 3–19, 20–39, 40–79 or 80+ characters. Success criteria earn
            5 extra points for a numeric target. Contact and collaboration each
            contribute 5. This measures completeness, not feasibility.
          </p>
        </details>
      </section>
      <section className="rail-card doctor">
        <div className="row-between">
          <h3>
            <Stethoscope size={20} /> AI Task Doctor
          </h3>
          <Sparkles size={17} />
        </div>
        <p className="health">
          Task Health: <strong>{score.total}%</strong>
        </p>
        <h4>
          {score.total >= 90
            ? "Your challenge is ready to shine."
            : score.total >= 70
              ? "Your challenge is almost ready."
              : "A little detail makes a big difference."}
        </h4>
        <span className="tiny-label">
          {score.total >= 90 ? "FINAL CHECK" : "HOW TO REACH 90+"}
        </span>
        {suggestions.length ? (
          <ul>
            {suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="complete-note">
            <CheckCircle2 size={17} /> All readiness criteria are complete.
            Review accuracy before publishing.
          </p>
        )}
        {onImprove && (
          <button className="button outline full" onClick={onImprove}>
            <Sparkles size={16} /> Improve Challenge
          </button>
        )}
        <small>
          Guidance only. Missing business facts are never filled in
          automatically.
        </small>
      </section>
    </>
  );
}
