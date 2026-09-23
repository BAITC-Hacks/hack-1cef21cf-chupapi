"use client";

import { useLocale } from "@/components/locale";
import Link from "./workspace-link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Send,
  Users,
  X,
} from "lucide-react";
import { toast } from "./localized-toast";
import { fieldLabels, fields, proposalInputSchema } from "@/lib/schema";
import { useStore } from "./store";
import { PageHeader, SidePanel, Loading } from "./shell";
import { ReadinessPanel, Badge } from "./readiness";
import { calculateReadinessScore } from "@/lib/readiness-score";
import { Editor } from "./editor";
import { QualityReview } from "./quality-review";
export function ProposalForm({ challenge, onClose }) {
  const { t, locale } = useLocale();
  const { submitProposal, saving, lastReview, clearReview } = useStore();
  const [form, setForm] = useState({
    teamName: "",
    idea: "",
    plan: "",
    duration: "",
    link: "",
  });
  const [errors, setErrors] = useState({});
  const labels = {
    teamName: "Team Name",
    idea: "Solution Idea",
    plan: "Implementation Plan",
    duration: "Estimated Duration",
    link: "Prototype / GitHub Link",
  };
  async function submit(e) {
    e.preventDefault();
    clearReview();
    const result = proposalInputSchema.safeParse(form);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    if (await submitProposal(challenge.id, result.data)) {
      toast.success(t("Proposal submitted successfully."));
      onClose();
    }
  }
  return (
    <section className="proposal-form" aria-label={t("Submit proposal")}>
      <div className="row-between">
        <div>
          <span className="eyebrow">{t("YOUR TEAM. YOUR APPROACH.")}</span>
          <h2>{t("Submit Proposal")}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("Close proposal")}
        >
          <X size={21} />
        </button>
      </div>
      <p className="lead">
        {t("Tell the business how you would tackle this challenge.")}
      </p>
      <QualityReview review={lastReview} />
      <form onSubmit={submit} noValidate>
        {t(
          Object.keys(labels).map((f) => (
            <label className="edit-field" key={f}>
              <span>
                {labels[f]} {f === "link" && <em>Optional</em>}
              </span>
              {f === "idea" || f === "plan" ? (
                <textarea
                  rows={4}
                  value={form[f]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f]: e.target.value,
                    })
                  }
                  maxLength={f === "plan" ? 5000 : 3000}
                />
              ) : (
                <input
                  value={form[f]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f]: e.target.value,
                    })
                  }
                  placeholder={
                    f === "link"
                      ? "https://github.com/your-team/project"
                      : f === "duration"
                        ? "e.g. 2 weeks"
                        : ""
                  }
                  maxLength={f === "link" ? 2000 : 100}
                />
              )}{" "}
              {errors[f] && (
                <small className="form-error" role="alert">
                  {errors[f]}
                </small>
              )}
            </label>
          )),
        )}
        <div className="publish-note">
          <Users size={17} />
          {t("Businesses review every proposal and choose teams themselves.")}
        </div>
        <button className="button primary full" type="submit" disabled={saving}>
          <Send size={17} />
          {t("Submit Proposal")}
        </button>
      </form>
    </section>
  );
}
export function Detail({ id }) {
  const { t, locale } = useLocale();
  const { db, ready, role } = useStore();
  const [showProposal, setShowProposal] = useState(false);
  const challenge = db.challenges.find((c) => c.id === id);
  if (!ready) return <Loading />;
  if (!challenge)
    return (
      <div className="empty-state">
        <h2>{t("Challenge not found")}</h2>
        <p>
          {t("This challenge may belong to a different local browser demo.")}
        </p>
        <Link className="button primary" href="/challenges">
          {t("Explore challenges")}
        </Link>
      </div>
    );
  if (challenge.status !== "published")
    return role === "Business" ? (
      <Editor existing={challenge} />
    ) : (
      <div className="empty-state">
        <h2>{t("This challenge is still a draft.")}</h2>
        <Link href="/challenges" className="button primary">
          {t("Explore published challenges")}
        </Link>
      </div>
    );
  const card = challenge.card;
  const score = calculateReadinessScore(card);
  const proposals = db.proposals.filter((p) => p.challengeId === id);
  return (
    <>
      <PageHeader
        title={t("Challenge")}
        subtitle={t(
          "A real-world problem. An opportunity to make a difference.",
        )}
        action={
          <Link
            href="/challenges"
            aria-label={t("Back to challenges")}
            className="icon-button"
          >
            <ArrowLeft size={21} />
          </Link>
        }
      />
      <div className="detail-content">
        <div className="detail-owner">
          <div className="avatar blue">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <strong>{t(challenge.owner)}</strong>
            <small>{t(card.industry || "Open challenge")}</small>
          </div>
          <span className="published-label">
            <CheckCircle2 size={14} />
            {t("Published")}
          </span>
        </div>
        <div className="detail-title">
          <Badge score={score.total} />
          <h2>{t(card.title)}</h2>
          <p>{t(card.problem)}</p>
        </div>
        <div className="detail-meta">
          <span>
            <Users size={16} />
            {t(proposals.length)}
            {t("teams applied")}
          </span>
          <span>
            <Clock3 size={16} />
            {t(
              new Date(challenge.createdAt).toLocaleDateString(
                locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              ),
            )}
          </span>
        </div>
        {t(
          challenge.contentReview && (
            <QualityReview review={challenge.contentReview} />
          ),
        )}
        {t(
          role === "Student" ? (
            <button
              className="button primary full"
              onClick={() => setShowProposal(true)}
            >
              <Send size={17} /> Submit Proposal
            </button>
          ) : (
            <Link
              className="button outline full"
              href={"/applications?challenge=" + id}
            >
              <Users size={17} /> Review {proposals.length} proposals{" "}
              <ArrowUpRight size={17} />
            </Link>
          ),
        )}
        {t(
          showProposal && role === "Student" && (
            <ProposalForm
              challenge={challenge}
              onClose={() => setShowProposal(false)}
            />
          ),
        )}
        <div className="detail-fields">
          {t(
            fields
              .filter((f) => !["title", "industry", "problem"].includes(f))
              .map((f) => (
                <section key={f}>
                  <h3>{fieldLabels[f]}</h3>
                  <p className={card[f] ? "" : "missing-text"}>
                    {card[f] ||
                      "Not provided yet — clarify this with the business."}
                  </p>
                </section>
              )),
          )}
        </div>
        <div className="decision-note">
          <CheckCircle2 size={21} />
          <div>
            <strong>{t("People make the final decision.")}</strong>
            <p>
              {t(
                "AI helps prepare the challenge. The business reviews proposals and manually selects its collaborators.",
              )}
            </p>
          </div>
        </div>
        <Link href="/challenges" className="text-link">
          {t("Explore more challenges")}
          <ExternalLink size={14} />
        </Link>
      </div>
      <SidePanel>
        <ReadinessPanel card={card} initialScore={challenge.initialScore} />
      </SidePanel>
    </>
  );
}
