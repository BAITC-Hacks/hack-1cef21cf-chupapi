/* eslint-disable react-hooks/set-state-in-effect -- The portal target is a browser DOM node available after hydration. */
"use client";

import { LanguagePicker } from "./locale";
import { useLocale } from "@/components/locale";
import Link from "./workspace-link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Compass,
  FlaskConical,
  GraduationCap,
  Home,
  Layers3,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Users,
  Zap,
  Send,
} from "lucide-react";
import { useStore } from "./store";
import { workspaceHref } from "@/lib/workspace-routes";
import { teams } from "@/lib/seed";
const businessNav = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/challenges",
    label: "Explore",
    icon: Compass,
  },
  {
    href: "/challenges/create",
    label: "Create Challenge",
    icon: Plus,
  },
  {
    href: "/my-challenges",
    label: "My Challenges",
    icon: Layers3,
  },
  {
    href: "/applications",
    label: "Applications",
    icon: Users,
  },
];
const studentNav = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/challenges",
    label: "Explore Challenges",
    icon: Compass,
  },
  {
    href: "/applications",
    label: "My Proposals",
    icon: Send,
  },
];
export function Logo() {
  return (
    <Link href="/" className="logo alem-logo" aria-label="Alem">
      alem<span>.</span>
    </Link>
  );
}
export function Shell({ children }) {
  const { t } = useLocale();
  const path = usePathname();
  const router = useRouter();
  const {
    role,
    setRole,
    db,
    storageError,
    refresh,
    legacyAvailable,
    importLegacy,
    saving,
  } = useStore();
  const student = role === "Student";
  const [search, setSearch] = useState("");
  const contextual = /\/challenges\/.+/.test(path);
  const pending = db.proposals.filter(
    (p) =>
      p.status === "Pending" &&
      (!student ||
        p.submittedBy === "demo-student" ||
        (!p.submittedBy && p.teamName === "DLX")),
  ).length;
  function switchRole(value) {
    setRole(value);
    router.push(value === "Student" ? "/student" : "/business");
  }
  return (
    <div
      className={
        "app-shell " + (student ? "student-workspace" : "business-workspace")
      }
    >
      <aside className="left-sidebar">
        <Logo />
        <LanguagePicker />
        <div className="role-box">
          <div className="row-between">
            <span className="tiny-label">{t("YOUR VIEW")}</span>
            <span className="demo-pill">{t("DEMO")}</span>
          </div>
          <div className="role-switch" aria-label={t("Demo role")}>
            {t(
              ["Business", "Student"].map((r) => (
                <button
                  key={r}
                  aria-pressed={role === r}
                  onClick={() => switchRole(r)}
                  className={role === r ? "selected" : ""}
                >
                  {r === "Business" ? (
                    <BriefcaseBusiness size={16} />
                  ) : (
                    <GraduationCap size={17} />
                  )}{" "}
                  {r}
                </button>
              )),
            )}
          </div>
        </div>

        <div className="workspace-label">
          {t(student ? "STUDENT WORKSPACE" : "BUSINESS WORKSPACE")}
        </div>
        <nav
          aria-label={t(student ? "Student navigation" : "Business navigation")}
        >
          {t(
            (student ? studentNav : businessNav).map(
              ({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={
                    "nav-link " +
                    (path === workspaceHref(href, role) ? "active" : "")
                  }
                >
                  <Icon
                    size={24}
                    strokeWidth={path === workspaceHref(href, role) ? 2.4 : 1.7}
                  />
                  <span>{label}</span>
                  {href === "/applications" && pending > 0 && (
                    <b className="nav-count">{pending}</b>
                  )}
                </Link>
              ),
            ),
          )}
        </nav>
        <Link
          href={student ? "/challenges" : "/challenges/create"}
          className="button primary create-nav"
          aria-label={t(student ? "Find a challenge" : "Create challenge")}
        >
          {t(student ? <Compass size={19} /> : <Plus size={19} />)}
          <span>{t(student ? "Find a challenge" : "Create challenge")}</span>
        </Link>
        <div className="sidebar-note">
          <div className="tiny-label">
            <FlaskConical size={14} />
            {t("BUILT FOR AI SANA")}
          </div>
          <h3>
            {t(
              student ? (
                <>
                  Real projects.
                  <br />
                  Real experience.
                </>
              ) : (
                <>
                  Small ideas.
                  <br />
                  Real-world impact.
                </>
              ),
            )}
          </h3>
          <p>
            {t(
              student
                ? "Bring your team. Build your portfolio. Make a difference."
                : "Your next collaboration starts with a good question.",
            )}
          </p>
          <Link href={student ? "/applications" : "/challenges/create?demo=1"}>
            {t(student ? "Track your proposals" : "Try the 5-minute demo")}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar navy">
            {t(
              student ? (
                <GraduationCap size={22} />
              ) : (
                <BriefcaseBusiness size={20} />
              ),
            )}
          </div>
          <div>
            <strong>
              {t(student ? "Your student team" : "Your business")}
            </strong>
            <small>
              {t("Demo account")}
              <span className="online-dot" />
            </small>
          </div>
          <span className="ellipsis">···</span>
        </div>
      </aside>
      <main className="main-column">
        {t(
          storageError && (
            <div role="alert" className="confirmation-banner">
              <span>{storageError}</span>
              <button className="button outline small" onClick={refresh}>
                Retry connection
              </button>
            </div>
          ),
        )}
        {t(
          legacyAvailable && !student && (
            <div className="confirmation-banner">
              <span>Existing browser drafts found.</span>
              <button
                className="button outline small"
                disabled={saving}
                onClick={importLegacy}
              >
                Import browser drafts
              </button>
            </div>
          ),
        )}
        {t(children)}
      </main>
      <aside className="right-sidebar">
        <form
          className="search-box"
          action={workspaceHref("/challenges", role)}
        >
          <Search size={19} />
          <input
            aria-label={t("Search challenges")}
            name="q"
            placeholder={t("Search challenges")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div id="context-panel" />
        {t(
          !contextual && (
            <>
              <section className="rail-card blue-card">
                <span className="eyebrow">
                  <Sparkles size={16} />
                  {student
                    ? "YOUR SKILLS DESERVE A REAL PROJECT"
                    : "A LITTLE CLARITY GOES A LONG WAY"}
                </span>
                <h2>
                  {student ? (
                    <>
                      Less theory.
                      <br />
                      More making things.
                    </>
                  ) : (
                    <>
                      Big impact starts
                      <br />
                      with a better brief.
                    </>
                  )}
                </h2>
                <p>
                  {student
                    ? "Find a challenge that fits your team. Share your approach and let the business get to know you."
                    : "Let AI turn your rough idea into a challenge teams can actually solve."}
                </p>
                <Link
                  href={student ? "/challenges" : "/challenges/create?demo=1"}
                  className="button primary"
                >
                  {student ? "Explore Challenges" : "Load Demo Scenario"}
                  <ArrowUpRight size={16} />
                </Link>
                <small>
                  {student
                    ? "Your proposal. Their decision. Real collaboration."
                    : "No perfect pitch needed."}
                </small>
              </section>
              <section className="rail-card">
                <div className="row-between">
                  <h3>How readiness works</h3>
                  <Trophy size={19} className="muted" />
                </div>
                <p>
                  {student
                    ? "Know what is clear before you commit."
                    : "Clearer challenges. Stronger starts."}
                </p>
                {[
                  ["Priority", "90–100", "green"],
                  ["Ready", "70–89", "blue"],
                  ["Workable", "40–69", "orange"],
                  ["Draft", "0–39", "gray"],
                ].map(([name, range, color]) => (
                  <div className="readiness-legend" key={name}>
                    <span className={"status-dot " + color} />
                    <strong>{name}</strong>
                    <span>{range}</span>
                  </div>
                ))}
                <div className="rail-foot">
                  <Check size={15} /> Every challenge gets a place here.
                </div>
              </section>
              <section className="rail-card teams-card">
                <div className="row-between">
                  <h3>{student ? "Builder community" : "Meet the builders"}</h3>
                  <span className="demo-pill">DEMO TEAMS</span>
                </div>
                {teams.slice(0, 3).map((t) => (
                  <div className="team-row" key={t.name}>
                    <div className={"avatar " + t.color}>
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{t.name}</strong>
                      <small>{t.skills}</small>
                    </div>
                    <span className="online-dot" />
                  </div>
                ))}
              </section>
            </>
          ),
        )}
        <footer>
          {t("AI Sana Hackathon \xB7 ChallengeHub AI")}
          <br />
          {t("Made for meaningful collaboration.")}
          <span>{t("SQLite database \xB7 Shared across browsers")}</span>
        </footer>
      </aside>
    </div>
  );
}
export function SidePanel({ children }) {
  const { t } = useLocale();
  const [target, setTarget] = useState(null);
  useEffect(() => {
    setTarget(document.getElementById("context-panel"));
  }, []);
  return target ? createPortal(children, target) : null;
}
export function PageHeader({ title, subtitle, action }) {
  const { t } = useLocale();
  return (
    <header className="page-header">
      <div>
        <h1>{t(title)}</h1>
        {t(subtitle && <p>{subtitle}</p>)}
      </div>
      {t(action)}
    </header>
  );
}
export function Loading() {
  const { t } = useLocale();
  return (
    <div className="loading-stack" aria-label={t("Loading challenges")}>
      {t([1, 2, 3].map((i) => <div className="skeleton" key={i} />))}
    </div>
  );
}
