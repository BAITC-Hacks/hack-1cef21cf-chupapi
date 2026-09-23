import kk from './locales/kk.js';

export const normalizeLocale = value => value === 'kk' ? 'kk' : 'ru';
let locale = 'ru';
try { locale = normalizeLocale(globalThis.localStorage?.getItem('alem.locale')); } catch {}
export const getLocale = () => locale;
export function setLocale(value) {
  locale = normalizeLocale(value);
  try { globalThis.localStorage?.setItem('alem.locale', locale); } catch {}
  return locale;
}
// Translate only explicit UI messages; user text and stored category identifiers stay unchanged.
export function tr(source, params = {}, language = locale) {
  const text = language === 'kk' ? kk[source] ?? source : source;
  return String(text).replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
}
export const messagesKK = kk;
