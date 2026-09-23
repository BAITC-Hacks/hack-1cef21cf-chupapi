/* eslint-disable react-hooks/set-state-in-effect -- Restore the saved language after hydration. */
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  isValidElement,
  cloneElement,
} from "react";
import catalog from "@/lib/translations.json";
const LocaleContext = createContext(null);
export function translate(value, locale = "ru") {
  if (typeof value === "string") {
    const key = value.replace(/\s+/g, " ").trim();
    const result = catalog[key]?.[locale];
    return result ? value.replace(value.trim(), result) : value;
  }
  if (Array.isArray(value))
    return value.map((item, index) => {
      const translated = translate(item, locale);
      return isValidElement(translated)
        ? cloneElement(translated, { key: translated.key ?? index })
        : translated;
    });
  if (isValidElement(value)) {
    const props = {};
    for (const key of [
      "children",
      "placeholder",
      "aria-label",
      "title",
      "subtitle",
    ])
      if (value.props[key] !== undefined)
        props[key] = translate(value.props[key], locale);
    // Preserve option values when translating text content.
    if (
      value.type === "option" &&
      value.props.value === undefined &&
      typeof value.props.children === "string"
    )
      props.value = value.props.children;
    return cloneElement(value, props);
  }
  return value;
}
export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState("ru");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("challengehub:locale");
      if (["ru", "kk", "en"].includes(saved)) setLocale(saved);
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = useCallback((value) => translate(value, locale), [locale]);
  function changeLocale(value) {
    if (!["ru", "kk"].includes(value)) return;
    setLocale(value);
    try {
      localStorage.setItem("challengehub:locale", value);
    } catch {}
  }
  return (
    <LocaleContext.Provider
      value={{ locale, setLocale: changeLocale, t, hydrated }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider missing");
  return value;
}
export function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  return (
    <label className="language-picker">
      <span>{locale === "kk" ? "Тіл" : "Язык"}</span>
      <select
        aria-label="Язык / Тіл"
        value={locale === "en" ? "ru" : locale}
        onChange={(event) => setLocale(event.target.value)}
      >
        <option value="ru">Русский</option>
        <option value="kk">Қазақша</option>
      </select>
    </label>
  );
}
