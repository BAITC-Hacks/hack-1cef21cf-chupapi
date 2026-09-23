/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only localStorage, URL and portal state after SSR. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "./store";
import { PageHeader, Loading } from "./shell";
import { Badge } from "./readiness";
import { calculateReadinessScore } from "@/lib/readiness-score";
export function MyChallenges() {
  const { db, ready, role, setRole } = useStore();
  const [tab, setTab] = useState("All");
  if (role === "Student")
    return (
      <>
        <PageHeader title="My Challenges" />
        <div className="empty-state">
          <FileText size={32} />
          <h2>Your business workspace</h2>
          <p>Use My Proposals to track your student proposals.</p>
          <button
            className="button primary"
            onClick={() => setRole("Business")}
          >
            Switch to Business
          </button>
        </div>
      </>
    );
  const list = db.challenges.filter(
    (c) =>
      tab === "All" ||
      (tab === "Published"
        ? c.status === "published"
        : c.status !== "published"),
  );
  return (
    <>
      <PageHeader
        title="My Challenges"
        subtitle="From first thought to the next big thing."
        action={
          <Link href="/challenges/create" className="button primary small">
            <Plus size={16} /> New
          </Link>
        }
      />
      <div className="workspace-intro">
        <span className="eyebrow">BUSINESS WORKSPACE</span>
        <h2>Your ideas, taking shape.</h2>
        <p>Your challenges are saved in the shared SQLite database.</p>
      </div>
      <div className="category-tabs">
        {["All", "Drafts", "Published"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {!ready ? (
        <Loading />
      ) : (
        list.map((c) => (
          <Link
            className="workspace-item"
            href={"/challenges/" + c.id}
            key={c.id}
          >
            <div className="avatar blue">
              <FileText size={22} />
            </div>
            <div>
              <span className="tiny-label">{c.status}</span>
              <h3>{c.card.title || "Untitled challenge"}</h3>
              <p>{c.card.problem?.slice(0, 105)}</p>
              <Badge score={calculateReadinessScore(c.card).total} />
            </div>
            <div className="workspace-score">
              <strong>
                {calculateReadinessScore(c.card).total}
                <small>/100</small>
              </strong>
              <ArrowUpRight size={18} />
            </div>
          </Link>
        ))
      )}
    </>
  );
}
export function Applications() {
  const { db, ready, role, decide, saving } = useStore();
  const [expanded, setExpanded] = useState([]);
  const [status, setStatus] = useState("All");
  const [challengeFilter, setChallengeFilter] = useState("");
  useEffect(() => {
    setChallengeFilter(
      new URLSearchParams(window.location.search).get("challenge") ?? "",
    );
  }, []);
  const visibleProposals =
    role === "Business"
      ? db.proposals
      : db.proposals.filter(
          (p) =>
            p.submittedBy === "demo-student" ||
            (!p.submittedBy && p.teamName === "DLX"),
        );
  const list = visibleProposals.filter(
    (p) =>
      (status === "All" || p.status === status) &&
      (!challengeFilter || p.challengeId === challengeFilter),
  );
  const counts = {
    Pending: visibleProposals.filter((p) => p.status === "Pending").length,
    Accepted: visibleProposals.filter((p) => p.status === "Accepted").length,
    Rejected: visibleProposals.filter((p) => p.status === "Rejected").length,
  };
  return (
    <>
      <PageHeader
        title={role === "Business" ? "Applications" : "My Proposals"}
        subtitle={
          role === "Business"
            ? "Great teams. Thoughtful proposals. Your decision."
            : "Track your team proposals and decisions from businesses."
        }
      />
      <div className="workspace-intro">
        <span className="eyebrow">
          {role === "Business"
            ? "FIND YOUR NEXT COLLABORATORS"
            : "STUDENT WORKSPACE"}
        </span>
        <h2>
          {role === "Business"
            ? "Meet the minds behind the ideas."
            : "Your next chapter starts here."}
        </h2>
        <p>
          AI never selects a team. Businesses manually accept or reject each
          proposal.
        </p>
        <div className="application-stats">
          {Object.entries(counts).map(([s, n]) => (
            <div key={s}>
              <strong>{n}</strong>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="category-tabs">
        {["All", "Pending", "Accepted", "Rejected"].map((t) => (
          <button
            key={t}
            className={status === t ? "selected" : ""}
            onClick={() => setStatus(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="application-filter">
        <label>
          Challenge{" "}
          <select
            aria-label="Filter proposals by challenge"
            value={challengeFilter}
            onChange={(e) => setChallengeFilter(e.target.value)}
          >
            <option value="">All challenges</option>
            {db.challenges
              .filter((c) => c.status === "published")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.card.title}
                </option>
              ))}
          </select>
        </label>
      </div>
      {!ready ? (
        <Loading />
      ) : list.length ? (
        list.map((p) => {
          const challenge = db.challenges.find((c) => c.id === p.challengeId);
          const open = expanded.includes(p.id);
          return (
            <article className="application-card" key={p.id}>
              <Link
                className="application-challenge"
                href={"/challenges/" + p.challengeId}
              >
                {challenge?.card.title ?? "Challenge"}
                <ArrowUpRight size={14} />
              </Link>
              <div className="row-between">
                <div className="team-row">
                  <div className="avatar purple">
                    {p.teamName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{p.teamName}</h3>
                    <small>{p.duration}</small>
                  </div>
                </div>
                <span className={"proposal-status " + p.status.toLowerCase()}>
                  {p.status === "Accepted" && <CheckCircle2 size={13} />}{" "}
                  {p.status}
                </span>
              </div>
              <p className="proposal-idea">{p.idea}</p>
              {open && (
                <div className="proposal-details">
                  <h4>Implementation Plan</h4>
                  <p>{p.plan}</p>
                  <h4>Estimated Duration</h4>
                  <p>{p.duration}</p>
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      Prototype / GitHub <ExternalLink size={14} />
                    </a>
                  ) : (
                    <p className="muted">No prototype link provided.</p>
                  )}
                </div>
              )}
              <div className="application-actions">
                <button
                  className="button text-button small"
                  onClick={() =>
                    setExpanded(
                      open
                        ? expanded.filter((id) => id !== p.id)
                        : [...expanded, p.id],
                    )
                  }
                >
                  {open ? "Hide proposal" : "View Proposal"}
                  <ChevronDown size={15} />
                </button>
                {role === "Business" && (
                  <div>
                    <button
                      disabled={saving || p.status === "Rejected"}
                      className="button outline small"
                      onClick={async () => {
                        if (await decide(p.id, "Rejected"))
                          toast.success("Proposal rejected by business.");
                      }}
                    >
                      <X size={15} /> Reject
                    </button>
                    <button
                      disabled={saving || p.status === "Accepted"}
                      className="button primary small"
                      onClick={async () => {
                        if (await decide(p.id, "Accepted"))
                          toast.success(
                            "Proposal accepted. Your decision has been saved.",
                          );
                      }}
                    >
                      <Check size={16} /> Accept
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })
      ) : (
        <div className="empty-state">
          <Users size={32} />
          <h3>No proposals here yet</h3>
          <p>
            {role === "Student"
              ? "Explore a challenge and share your team's idea."
              : "Published challenges are ready for student proposals."}
          </p>
          <Link href="/challenges" className="button outline">
            Explore Challenges
          </Link>
        </div>
      )}
    </>
  );
}
