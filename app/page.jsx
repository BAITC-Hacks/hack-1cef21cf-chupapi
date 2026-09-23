"use client";

import { useLocale } from "@/components/locale";
import Link from "next/link";
import { BriefcaseBusiness, GraduationCap, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shell";
export default function Home() {
  const { t, locale } = useLocale();
  return (
    <>
      <PageHeader
        title={t("ChallengeHub AI")}
        subtitle={t(
          "Turn vague business problems into student-ready challenges.",
        )}
      />
      <section className="workspace-entry">
        <span className="tiny-label">
          {t("TWO WORKSPACES. ONE SHARED MARKETPLACE.")}
        </span>
        <h2>{t("What brings you here?")}</h2>
        <p>{t("Choose your workspace to get started.")}</p>
        <Link href="/business" className="workspace-entry-card">
          <BriefcaseBusiness size={32} />
          <h3>{t("I am a business")}</h3>
          <p>
            {t(
              "Structure a challenge with AI, publish it and review student proposals.",
            )}
          </p>
          <strong>
            {t("Open business workspace")}
            <ArrowUpRight size={18} />
          </strong>
        </Link>
        <Link href="/student" className="workspace-entry-card student-entry">
          <GraduationCap size={32} />
          <h3>{t("I am a student")}</h3>
          <p>
            {t(
              "Explore real business problems, propose a solution and track your team?s applications.",
            )}
          </p>
          <strong>
            {t("Open student workspace")}
            <ArrowUpRight size={18} />
          </strong>
        </Link>
      </section>
    </>
  );
}
