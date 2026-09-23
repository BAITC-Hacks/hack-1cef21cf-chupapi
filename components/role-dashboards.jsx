"use client";

import { useLocale } from "@/components/locale";
import Link from "./workspace-link";
import { BriefcaseBusiness, GraduationCap, ArrowUpRight } from "lucide-react";
import { useStore } from "./store";
import { PageHeader, Loading } from "./shell";

import { MyChallenges } from "./workspace";
import { Feed } from "./feed";
export function BusinessDashboard() {
  const { t } = useLocale();
  const { db, ready } = useStore();
  if (!ready) return <Loading />;
  const drafts = db.challenges.filter((c) => c.status !== "published").length;
  const pending = db.proposals.filter((p) => p.status === "Pending").length;
  return (
    <>
      <PageHeader
        title={t("Business Dashboard")}
        subtitle={t(
          "Prepare better briefs. Review proposals. Choose your teams.",
        )}
      />

      <div className="workspace-actions">
        <Link href="/my-challenges" className="workspace-action">
          <BriefcaseBusiness />
          <strong>
            {t(drafts)}
            {t("challenges to prepare")}
          </strong>
          <span>{t("Continue editing and improve readiness")}</span>
          <ArrowUpRight />
        </Link>
        <Link href="/applications" className="workspace-action">
          <strong>
            {t(pending)}
            {t("proposals to review")}
          </strong>
          <span>{t("Compare approaches and decide manually")}</span>
          <ArrowUpRight />
        </Link>
      </div>
      <MyChallenges />
    </>
  );
}
export function StudentDashboard() {
  const { t } = useLocale();
  const { db } = useStore();
  const mine = db.proposals.filter(
    (p) =>
      p.submittedBy === "demo-student" ||
      (!p.submittedBy && p.teamName === "DLX"),
  );
  return (
    <>
      <PageHeader
        title={t("Student Dashboard")}
        subtitle={t("Find a real project and pitch your team's solution.")}
      />

      <div className="workspace-actions">
        <Link href="/applications" className="workspace-action">
          <GraduationCap />
          <strong>
            {t(mine.length)}
            {t("team proposals")}
          </strong>
          <span>{t("Track responses and accepted projects")}</span>
          <ArrowUpRight />
        </Link>
        <Link href="/challenges" className="workspace-action">
          <strong>{t("Find your next challenge")}</strong>
          <span>{t("All published tasks are open to your team")}</span>
          <ArrowUpRight />
        </Link>
      </div>
      <Feed />
    </>
  );
}
