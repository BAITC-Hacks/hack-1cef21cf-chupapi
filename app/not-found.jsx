"use client";
import Link from "@/components/workspace-link";
import { useLocale } from "@/components/locale";
export default function NotFound() {
  const { locale, t } = useLocale();
  return (
    <div className="empty-state">
      <h1>{locale === "kk" ? "Бет табылмады" : "Страница не найдена"}</h1>
      <p>
        {locale === "kk"
          ? "Тапсырмалар каталогына оралыңыз."
          : "Вернитесь в каталог задач."}
      </p>
      <Link href="/challenges" className="button primary">
        {t("Explore Challenges")}
      </Link>
    </div>
  );
}
