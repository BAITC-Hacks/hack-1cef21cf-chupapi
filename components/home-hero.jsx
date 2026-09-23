"use client";

import { useLocale } from "@/components/locale";
import Link from "./workspace-link";
import {
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { useStore } from "./store";
export function HomeHero() {
  const { t } = useLocale();
  const { role, db } = useStore();
  const student = role === "Student";
  const mine = db.proposals.filter(
    (p) =>
      p.submittedBy === "demo-student" ||
      (!p.submittedBy && p.teamName === "DLX"),
  );
  const stats = student
    ? [
        [
          String(db.challenges.filter((c) => c.status === "published").length),
          "Open challenges",
        ],
        [String(mine.length), "My proposals"],
        [
          String(mine.filter((p) => p.status === "Accepted").length),
          "Accepted",
        ],
        ["5", "Demo teams"],
      ]
    : [
        ["24", "Challenges"],
        ["18", "Student teams"],
        ["87", "Avg. readiness"],
        ["9", "Projects started"],
      ];
  return (
    <>
      <section className={"hero " + (student ? "student-hero" : "")}>
        <div className="hero-noise" />
        <span className="hero-label">
          <span />
          {t(
            student
              ? "STUDENT WORKSPACE · YOUR NEXT CHAPTER"
              : "BUSINESS WORKSPACE · IDEAS MEET IMPACT",
          )}
        </span>
        <h2>
          {t(
            student ? (
              <>
                Your skills.
                <br />
                Real challenges.
                <br />
                <span>Meaningful experience.</span>
              </>
            ) : (
              <>
                Real problems.
                <br />
                Fresh perspectives.
                <br />
                <span>Extraordinary impact.</span>
              </>
            ),
          )}
        </h2>
        <p>
          {t(
            student ? (
              "Build something that matters. Discover real business challenges, pitch your approach, and turn your skills into hands-on experience."
            ) : (
              <>
                Turn business problems into real student projects.
                <br />
                AI helps companies structure challenges, measure their
                readiness, and connect with student teams.
              </>
            ),
          )}
        </p>
        <div className="hero-buttons">
          <Link
            href={student ? "/challenges" : "/challenges/create"}
            className="button white"
          >
            {t(student ? "Find a Challenge" : "Create Challenge")}
            <ArrowUpRight size={17} />
          </Link>
          <Link
            href={student ? "/applications" : "/challenges"}
            className="hero-secondary"
          >
            {t(student ? "My Proposals" : "Explore Challenges")}
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="hero-bottom">
          <div className="mini-avatars">
            <span>{t("DM")}</span>
            <span>{t("AK")}</span>
            <span>{t("NS")}</span>
          </div>
          <span>
            {t(
              student
                ? "Learn by building. Grow by collaborating."
                : "Built together. Better together.",
            )}
          </span>
          <Sparkles size={18} />
        </div>
        <div className="hero-orbit one" />
        <div className="hero-orbit two" />
      </section>
      <div className="stats-row">
        {t(
          stats.map(([n, l]) => (
            <div key={l}>
              <strong>
                {n}
                {l === "Avg. readiness" && <small>/100</small>}
              </strong>
              <span>{l}</span>
            </div>
          )),
        )}
      </div>
      <div className="demo-caption">
        {t(
          student
            ? "Your activity in this demo workspace"
            : "Hackathon community · illustrative demo statistics",
        )}
      </div>
      <div className="composer">
        <div className="avatar navy">
          {t(student ? <GraduationCap size={21} /> : <Sparkles size={21} />)}
        </div>
        <div>
          <Link href={student ? "/applications" : "/challenges/create"}>
            {t(
              student
                ? "Your next project starts with a proposal."
                : "What challenge is on your mind?",
            )}
          </Link>
          <span>
            {t(
              student
                ? "Track your applications and business decisions."
                : "A rough idea is a great place to start.",
            )}
          </span>
        </div>
        <Link
          href={student ? "/applications" : "/challenges/create"}
          className="button primary small"
        >
          {t(student ? "My proposals" : "Create")}
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
}
