/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only localStorage, URL and portal state after SSR. */
"use client";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  Coffee,
  Globe2,
  Leaf,
  MessageCircle,
  Search,
  Users,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "./store";
import { calculateReadinessScore } from "@/lib/readiness-score";
import { Badge } from "./readiness";
import { PageHeader, Loading } from "./shell";
import { HomeHero } from "./home-hero";
const categories = [
  "All",
  "AI",
  "Education",
  "FinTech",
  "Smart City",
  "Retail",
  "Healthcare",
];
export function ChallengePost({ challenge, index = 0 }) {
  const { db } = useStore();
  const { card } = challenge;
  const score = calculateReadinessScore(card);
  const count = db.proposals.filter(
    (p) => p.challengeId === challenge.id,
  ).length;
  const color = card.industry?.includes("Smart")
    ? "green"
    : card.industry?.includes("FinTech")
      ? "purple"
      : card.industry?.includes("Education")
        ? "orange"
        : "blue";
  const Icon = card.industry?.includes("Smart")
    ? Leaf
    : card.industry?.includes("Retail")
      ? Coffee
      : Globe2;
  return (
    <article
      className="challenge-post"
      style={{ animationDelay: index * 40 + "ms" }}
    >
      <div className={"avatar org-avatar " + color}>
        <Icon size={23} />
      </div>
      <div className="post-body">
        <div className="post-byline">
          <strong>{challenge.owner}</strong>
          <BadgeCheck size={16} className="verified" fill="currentColor" />
          <span>· {card.industry || "Open challenge"}</span>
          <span className="post-date">
            {new Date(challenge.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <Link href={"/challenges/" + challenge.id} className="post-title">
          {card.title || "Untitled challenge"}
          <ArrowUpRight size={19} />
        </Link>
        <p className="post-description">
          {card.problem ||
            card.context ||
            "Help a business turn an early idea into a real project."}
        </p>
        <div className="tags">
          {(card.skills?.split(",").slice(0, 3) || ["Collaboration"]).map(
            (s) => (
              <span key={s}>#{s.trim().replaceAll(" ", "")}</span>
            ),
          )}
        </div>
        <Link
          href={"/challenges/" + challenge.id}
          className={"challenge-preview " + color}
        >
          <div>
            <span className="tiny-label">
              <Zap size={12} /> REAL PROBLEM. REAL POSSIBILITY.
            </span>
            <h3>{card.title || "An idea worth exploring"}</h3>
            <span className="preview-link">
              Make your skills matter <ArrowUpRight size={15} />
            </span>
          </div>
          <div className="preview-art">
            <Icon size={48} strokeWidth={1.2} />
            <span />
            <span />
          </div>
        </Link>
        <div className="post-actions">
          <span>
            <Users size={17} />
            {count} {count === 1 ? "team" : "teams"} applied
          </span>
          <span className="post-score">
            <BarChart3 size={17} />
            <b>{score.total}</b>
            <span>/ 100</span>
          </span>
          <Badge score={score.total} />
          <Link
            href={"/challenges/" + challenge.id}
            aria-label={"View " + card.title}
          >
            View challenge <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Feed({ home = false }) {
  const { db, ready } = useStore();
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [sort, setSort] = useState("Highest Readiness");
  const [query, setQuery] = useState("");
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  const published = db.challenges.filter((c) => c.status === "published");
  const filtered = published
    .filter((c) => {
      const text = Object.values(c.card).join(" ").toLowerCase();
      return (
        (category === "All" ||
          (category === "AI"
            ? /\b(ai|machine learning|forecasting|prediction)\b/i.test(text)
            : (c.card.industry || "")
                .toLowerCase()
                .includes(category.toLowerCase()))) &&
        (level === "All" || calculateReadinessScore(c.card).level === level) &&
        (!query ||
          text.includes(query.toLowerCase()) ||
          c.owner.toLowerCase().includes(query.toLowerCase()))
      );
    })
    .sort((a, b) =>
      sort === "Newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : calculateReadinessScore(b.card).total -
          calculateReadinessScore(a.card).total,
    );
  return (
    <>
      <PageHeader
        title={home ? "Home" : "Explore Challenges"}
        subtitle={
          home
            ? "Where ideas meet impact."
            : "Find real business problems and build solutions that matter."
        }
        action={
          <span className="live-label">
            <span className="online-dot" /> AI SANA 2026
          </span>
        }
      />
      {home && <HomeHero />}
      <div className="feed-heading">
        <h2>
          {home ? "Your next opportunity" : "The challenge feed"}{" "}
          <span>{published.length}</span>
        </h2>
        <span>
          <Globe2 size={14} /> Open to all builders
        </span>
      </div>
      <div className="category-tabs">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "selected" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <label>
          <Search size={16} />
          <input
            aria-label="Filter challenges"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find your next challenge"
          />
        </label>
        <label className="select-label">
          <span className="sr-only">Readiness</span>
          <select
            aria-label="Readiness"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {["All", "Priority", "Ready", "Workable", "Draft"].map((l) => (
              <option key={l} value={l}>
                {l === "All" ? "All readiness" : l}
              </option>
            ))}
          </select>
        </label>
        <label className="select-label">
          <ArrowDownWideNarrow size={14} />
          <select
            aria-label="Sort challenges"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Highest Readiness</option>
            <option>Newest</option>
          </select>
        </label>
      </div>
      {!ready ? (
        <Loading />
      ) : filtered.length ? (
        filtered.map((c, i) => (
          <ChallengePost key={c.id} challenge={c} index={i} />
        ))
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h3>No challenges found</h3>
          <p>Try a different category or search term.</p>
          <button
            className="button outline"
            onClick={() => {
              setQuery("");
              setLevel("All");
              setCategory("All");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="feed-end">
        <MessageCircle size={18} />
        <span>Every great collaboration starts with a conversation.</span>
        <Clock3 size={15} />
      </div>
    </>
  );
}
