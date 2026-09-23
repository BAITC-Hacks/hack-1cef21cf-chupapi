"use client";

import { useLocale } from "@/components/locale";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Rocket,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "./localized-toast";
import { emptyCard, fieldLabels, fields, interviewLabels } from "@/lib/schema";
import {
  analyzeChallenge,
  demoInterviewAnswers,
  demoDescription,
  requestAI,
} from "@/lib/ai";
import { calculateReadinessScore, isProvided } from "@/lib/readiness-score";
import { useStore } from "./store";
import { PageHeader, SidePanel } from "./shell";
import { ReadinessPanel } from "./readiness";
import { QualityReview } from "./quality-review";
export function Editor({ existing }) {
  const { t, locale, hydrated } = useLocale();
  const demoLoaded = useRef(false);
  const { role, setRole, saveChallenge, saving, lastReview, clearReview } =
    useStore();
  const [review, setReview] = useState(existing?.contentReview ?? null);
  const router = useRouter();
  const [step, setStep] = useState(existing ? 2 : 0);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [card, setCard] = useState(existing?.card ?? emptyCard());
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("MOCK AI");
  const [reason, setReason] = useState("Works with or without an API key.");
  const [demo, setDemo] = useState(false);
  const [initialScore, setInitialScore] = useState(existing?.initialScore ?? 0);
  const [interviewScore, setInterviewScore] = useState(
    existing?.interviewScore ?? 0,
  );
  const [confirmed, setConfirmed] = useState(existing?.status === "confirmed");
  const [id, setId] = useState(existing?.id ?? "");
  const [error, setError] = useState("");
  const fieldRefs = useRef({});
  const score = calculateReadinessScore(card);
  useEffect(() => {
    if (
      hydrated &&
      !demoLoaded.current &&
      !existing &&
      new URLSearchParams(window.location.search).get("demo") === "1"
    ) {
      demoLoaded.current = true;
      setDescription(t(demoDescription));
      setDemo(true);
    }
  }, [existing, t, hydrated]);
  useEffect(() => {
    function warn(event) {
      event.preventDefault();
    }
    if (step > 0) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step]);
  function loadDemo() {
    setDescription(t(demoDescription));
    setDemo(true);
    setStep(0);
    setAnswers({});
    setConfirmed(false);
    setCard(emptyCard());
    setError("");
    toast.info(t("Weak demo brief loaded. Analyze it to begin."));
  }
  async function analyze() {
    if (!description.trim()) {
      setError("Please describe the challenge before continuing.");
      return;
    }
    setError("");
    setBusy(true);
    const initial = analyzeChallenge(description);
    setInitialScore(calculateReadinessScore(initial.card).total);
    const result = await requestAI(description, {}, locale);
    setReview(result.review);
    clearReview();
    if (result.review.status === "needs_clarification") {
      setBusy(false);
      return;
    }
    setCard(result.analysis.card);
    setQuestions(result.analysis.questions);
    setMode(result.mode);
    setReason(result.reason ?? "");
    setStep(1);
    setBusy(false);
  }
  async function generate() {
    if (!Object.values(answers).some((v) => v?.trim())) {
      setError("At least one answer is required.");
      return;
    }
    setError("");
    setBusy(true);
    const result = await requestAI(description, answers, locale);
    setReview(result.review);
    clearReview();
    if (result.review.status === "needs_clarification") {
      setBusy(false);
      return;
    }
    setCard(result.analysis.card);
    setInterviewScore(calculateReadinessScore(result.analysis.card).total);
    setMode(result.mode);
    setReason(result.reason ?? "");
    setStep(2);
    setConfirmed(false);
    setBusy(false);
    toast.success(t("Challenge Card generated. Review and edit every detail."));
  }
  function record(status) {
    return {
      id: id || crypto.randomUUID(),
      card,
      description,
      status,
      initialScore,
      interviewScore,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      owner: existing?.owner ?? "Your business",
    };
  }
  async function save(status) {
    const data = record(status);
    if (await saveChallenge(data)) {
      setId(data.id);
      return data;
    }
    return null;
  }
  async function confirm() {
    if (!isProvided(card.title) || !isProvided(card.problem)) {
      setError("Add a title and business problem before confirming.");
      return;
    }
    setError("");
    if (await save("confirmed")) {
      setConfirmed(true);
      toast.success(t("Challenge confirmed. You can now publish it."));
    }
  }
  async function publish() {
    if (!confirmed) return;
    const saved = await save("published");
    if (saved) {
      toast.success(t("Challenge published successfully!"));
      router.push("/business/challenges/" + saved.id);
    }
  }
  function improve() {
    const target =
      fields.find((f) => !isProvided(card[f])) ??
      (score.breakdown.successCriteria < 15 ? "successCriteria" : "data");
    fieldRefs.current[target]?.focus();
    fieldRefs.current[target]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    toast.info(
      t(
        "Add your own facts to the highlighted field. The Task Doctor never invents details.",
      ),
    );
  }
  if (role !== "Business")
    return (
      <>
        <PageHeader title={t("Create Challenge")} />
        <div className="empty-state">
          <FileText size={36} />
          <h2>{t("Put on your business hat.")}</h2>
          <p>{t("Switch to Business to prepare and publish a challenge.")}</p>
          <button
            className="button primary"
            onClick={() => setRole("Business")}
          >
            {t("Switch to Business")}
          </button>
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title={t(existing ? "Edit Challenge" : "Create Challenge")}
        subtitle={t("A better brief. A better beginning.")}
        action={<span className="demo-pill">{t("BUSINESS WORKSPACE")}</span>}
      />
      <div className="steps">
        {t(
          ["Describe", "AI interview", "Challenge Card"].map((s, i) => (
            <div
              className={i === step ? "current" : i < step ? "done" : ""}
              key={s}
            >
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              {s}
              {i < 2 && <i />}
            </div>
          )),
        )}
      </div>
      <div className="editor-content">
        {t(
          step === 0 && (
            <>
              <div className="section-icon">
                <Sparkles size={26} />
              </div>
              <span className="eyebrow">FROM “WHAT IF” TO WHAT IS NEXT</span>
              <h2>
                Describe your
                <br />
                business challenge.
              </h2>
              <p className="lead">
                Do not worry about making it perfect. Write the problem in your
                own words — AI will help structure it.
              </p>
              <label className="field-label" htmlFor="description">
                What would you like to solve?
              </label>
              <textarea
                id="description"
                className="description-input"
                maxLength={6000}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setReview(null);
                  clearReview();
                }}
                placeholder="We run several coffee shops and during peak hours customers wait too long. We want to use technology or AI to reduce queues."
              />
              <div className="input-meta">
                <span>
                  <FileText size={13} /> A few sentences are all you need.
                </span>
                <span>{description.length}/6000</span>
              </div>
              <div className="editor-actions">
                <button className="button outline" onClick={loadDemo}>
                  Load Demo Scenario
                </button>
                <button
                  className="button primary"
                  disabled={busy || saving}
                  onClick={analyze}
                >
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}{" "}
                  {busy ? "Analyzing…" : "Analyze with AI"}
                </button>
              </div>
              <div className="trust-note">
                <CheckCircle2 size={18} />
                <div>
                  <strong>What AI does for your challenge</strong>
                  <p>
                    Checks whether the problem makes sense, asks 3 relevant
                    questions, flags unrelated answers and contradictions, then
                    structures your facts.
                  </p>
                </div>
              </div>
            </>
          ),
        )}
        {t(
          step === 1 && (
            <>
              <div className="row-between">
                <span className="eyebrow">
                  <Sparkles size={15} /> LET US FILL IN THE GAPS
                </span>
                <span className="mode-badge">{mode}</span>
              </div>
              <h2>Just 3 quick questions.</h2>
              <p className="lead">
                Three answers are enough to get started. Unknown details can
                stay blank.
              </p>
              <div className="original-brief">
                <span className="tiny-label">YOUR ORIGINAL BRIEF</span>
                <p>{description}</p>
              </div>
              <div className="mode-note">{reason}</div>
              {demo && (
                <div className="demo-answer-box">
                  <div>
                    <strong>Speed up your demo</strong>
                    <p>
                      Use explicitly labeled fictional answers, then make them
                      your own.
                    </p>
                  </div>
                  <button
                    className="button outline small"
                    onClick={() => {
                      setAnswers(
                        Object.fromEntries(
                          Object.entries(demoInterviewAnswers).map(
                            ([key, value]) => [
                              key,
                              value
                                .split("\n")
                                .map((line) => {
                                  const colon = line.indexOf(": ");
                                  return (
                                    line.slice(0, colon + 2) +
                                    t(line.slice(colon + 2))
                                  );
                                })
                                .join("\n"),
                            ],
                          ),
                        ),
                      );
                      toast.info(
                        "Synthetic demo answers inserted for your review.",
                      );
                    }}
                  >
                    Use sample answers
                  </button>
                </div>
              )}
              <div className="questions">
                {questions.map((q, i) => (
                  <label className="question" key={q.field}>
                    <span className="question-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{q.question}</strong>
                      <textarea
                        maxLength={6000}
                        value={answers[q.field] ?? ""}
                        onChange={(e) => {
                          setAnswers({
                            ...answers,
                            [q.field]: e.target.value,
                          });
                          setReview(null);
                          clearReview();
                        }}
                        placeholder={
                          "Your answer · " + interviewLabels[q.field]
                        }
                        aria-label={interviewLabels[q.field]}
                      />
                    </div>
                  </label>
                ))}
              </div>
              <div className="editor-actions">
                <button
                  className="button text-button"
                  onClick={() => setStep(0)}
                  disabled={busy}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="button primary"
                  onClick={generate}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}{" "}
                  {busy ? "Structuring…" : "Generate Challenge Card"}
                </button>
              </div>
            </>
          ),
        )}
        {t(
          step === 2 && (
            <>
              <div className="row-between">
                <span className="eyebrow">
                  <ClipboardCheck size={15} /> SHAPED BY AI. APPROVED BY YOU.
                </span>
                <span className="mode-badge">{mode}</span>
              </div>
              <h2>Make it challenge-ready.</h2>
              <p className="lead">
                Review every field. Add the details only you know. Your
                readiness score updates as you type.
              </p>
              <div className="improvement-journey">
                <div>
                  <span>Initial score</span>
                  <strong>{initialScore}</strong>
                </div>
                <ArrowRight size={18} />
                <div>
                  <span>After interview</span>
                  <strong>{interviewScore}</strong>
                </div>
                <ArrowRight size={18} />
                <div className="current-score">
                  <span>After improvements</span>
                  <strong>{score.total}</strong>
                </div>
              </div>
              {confirmed && (
                <div className="confirmation-banner">
                  <CheckCircle2 size={21} />
                  <div>
                    <strong>Confirmed by you</strong>
                    <p>
                      Your challenge is ready to publish. Editing it will
                      require confirmation again.
                    </p>
                  </div>
                </div>
              )}
              <div className="mode-note">
                <span className="mode-badge">{mode}</span> {reason}
              </div>
              <p className="mode-note">
                Every edit needs a fresh AI relevance check when you confirm.
                Readiness measures completeness, not whether claims are true.
              </p>
              <div className="card-fields">
                {fields.map((field) => (
                  <label
                    key={field}
                    className={
                      "edit-field " +
                      (!isProvided(card[field]) ? "missing" : "")
                    }
                  >
                    <span>
                      {fieldLabels[field]}{" "}
                      {!isProvided(card[field]) && <em>Missing</em>}
                    </span>
                    <textarea
                      ref={(el) => {
                        fieldRefs.current[field] = el;
                      }}
                      aria-label={fieldLabels[field]}
                      rows={
                        field === "title" ||
                        field === "industry" ||
                        field === "skills"
                          ? 1
                          : 3
                      }
                      maxLength={6000}
                      value={card[field] ?? ""}
                      placeholder={
                        "Add " + fieldLabels[field].toLowerCase() + "…"
                      }
                      onChange={(e) => {
                        setCard({
                          ...card,
                          [field]: e.target.value || null,
                        });
                        setReview(null);
                        clearReview();
                        setConfirmed(false);
                        setError("");
                      }}
                    />
                  </label>
                ))}
              </div>
              <div className="publish-note">
                <CheckCircle2 size={17} /> You decide when this goes live.
                Low-readiness challenges are welcome, too.
              </div>
              <div className="editor-actions sticky-actions">
                <button
                  className="button outline"
                  onClick={async () => {
                    if (await save("draft")) {
                      setConfirmed(false);
                      toast.success("Draft saved in My Challenges.");
                    }
                  }}
                >
                  <Save size={16} /> Save draft
                </button>
                {confirmed ? (
                  <button
                    className="button primary"
                    disabled={saving}
                    onClick={publish}
                  >
                    <Rocket size={17} /> Publish Challenge
                  </button>
                ) : (
                  <button
                    className="button primary"
                    disabled={saving}
                    onClick={confirm}
                  >
                    <Check size={18} />{" "}
                    {saving ? "AI reviewing…" : "Confirm Challenge"}
                  </button>
                )}
              </div>
            </>
          ),
        )}
        <QualityReview review={lastReview ?? review} />
        {t(
          error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          ),
        )}
      </div>
      <SidePanel>
        {t(
          step === 0 ? (
            <section className="rail-card interview-guide">
              <div className="section-icon">
                <Sparkles size={24} />
              </div>
              <h3>
                From a rough idea
                <br />
                to a real opportunity.
              </h3>
              <p>Three small steps, one big leap forward.</p>
              {[
                [
                  "01",
                  "Start with the problem",
                  "Tell us what's getting in your way.",
                ],
                [
                  "02",
                  "Add a little context",
                  "Answer questions tailored to your brief.",
                ],
                [
                  "03",
                  "Make it yours",
                  "Edit, confirm and share with student teams.",
                ],
              ].map(([n, t, d]) => (
                <div className="guide-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <strong>{t}</strong>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
              <div className="rail-foot">
                No invented facts. No automatic publishing.
              </div>
            </section>
          ) : (
            <ReadinessPanel
              card={card}
              initialScore={initialScore}
              onImprove={step === 2 ? improve : undefined}
            />
          ),
        )}
      </SidePanel>
    </>
  );
}
