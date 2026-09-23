import { tr, normalizeLocale } from './i18n.js';
// Points come from an evidence-backed review of this exact revision, never field presence.
export const fields = [
  { key: 'context', label: 'Контекст', placeholder: 'Что происходит сейчас? Как вы решаете эту задачу сегодня?' },
  { key: 'description', label: 'Потребность', placeholder: 'Какую проблему нужно решить и что изменить?' },
  { key: 'users', label: 'Пользователи', placeholder: 'Кто будет пользоваться результатом?' },
  { key: 'data', label: 'Данные и материалы', placeholder: 'Какие примеры, файлы или источники вы предоставите?' },
  { key: 'result', label: 'Ожидаемый результат', placeholder: 'Что команда должна передать в конце работы?' },
  { key: 'success', label: 'Критерии успеха', placeholder: 'Как проверите результат? Укажите измеримый критерий.' },
  { key: 'constraints', label: 'Ограничения', placeholder: 'Сроки, технологии, доступы и другие условия.' },
  { key: 'contact', label: 'Контакт', placeholder: 'Имя и рабочий email, Telegram или другой способ связи.' },
  { key: 'interaction', label: 'Формат взаимодействия', placeholder: 'Как часто вы готовы встречаться и давать обратную связь?' },
];
export const rules = [
  { label: 'Контекст и потребность', keys: ['context', 'description'], weight: 20 },
  { label: 'Данные и материалы', keys: ['data'], weight: 20 },
  { label: 'Ожидаемый результат', keys: ['result'], weight: 15 },
  { label: 'Критерии успеха', keys: ['success'], weight: 15 },
  { label: 'Ограничения', keys: ['constraints'], weight: 10 },
  { label: 'Пользователи', keys: ['users'], weight: 10 },
  { label: 'Связь с бизнесом', keys: ['contact', 'interaction'], weight: 10 },
];
export function hasContent(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase().replace(/ё/g, 'е').replace(/[.!?]+$/, '') : '';
  return /[\p{L}\p{N}]/u.test(text) && !/^(?:ну+\s*)?(?:не[ -]?а|ага|да|нет|хз|не знаю|позже|неизвестно|tbd|n\/a|(?:еще |пока )?в процессе|уточняется(?: с бизнесом)?|(?:пока )?не (?:указан[оы]?|предоставлен[оы]?|определились)|нет данных|сведения предоставлены бизнесом|білмеймін|жоқ|кейін|белгісіз|әлі дайын емес|нақтылануда)$/.test(text);
}

export const assessmentVersion = 2;
// Formatting differences do not change facts; numbers, words and punctuation must match.
export const normalizeSource = value => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
export const containsSource = (source, quote) => normalizeSource(source).includes(normalizeSource(quote));
const revisionKeys = ['title', ...fields.map(f => f.key), 'category', 'weeks'];
export const taskRevision = task => JSON.stringify(revisionKeys.map(key => typeof task[key] === 'string' ? task[key].trim() : ''));

// Used on the server and when reading saved reviews. A number alone is never trusted.
export function validateAssessment(value, task, locale = 'ru') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length) throw new Error('Неполная оценка');
  const reviewed = {};
  for (const { key } of fields) {
    const item = value[key];
    const text = typeof task[key] === 'string' ? task[key].trim() : '';
    if (!item || ![0, 1, 2, 3, 4].includes(item.level) || typeof item.reason !== 'string' || item.reason.trim().length < 1 || item.reason.length > 500 || !Array.isArray(item.evidence) || item.evidence.length > 2) throw new Error('Некорректная оценка');
    if (item.evidence.some(quote => typeof quote !== 'string' || !quote.trim() || quote.length > 600 || !containsSource(text, quote))) throw new Error('Оценка не подтверждена текстом поля');
    if (item.level > 0 && !item.evidence.length) throw new Error('Нет основания для баллов');
    let level = item.level;
    let reason = item.reason.trim();
    const repeated = text && fields.filter(f => String(task[f.key] || '').trim() === text).length >= 3;
    if (level > 0 && (!hasContent(text) || repeated)) { level = 0; reason = tr('Добавьте конкретные сведения для этого поля.', {}, locale); }
    if (key === 'contact' && /example\.(?:com|org|net)|\(демо\)/i.test(text)) { level = 0; reason = tr('Замените демонстрационный контакт на рабочий способ связи.', {}, locale); }
    reviewed[key] = { level, reason, evidence: [...item.evidence] };
  }
  return { version: assessmentVersion, locale: normalizeLocale(locale), snapshot: taskRevision(task), fields: reviewed };
}

export function currentAssessment(task) {
  const review = task.assessment;
  if (!review || review.version !== assessmentVersion || review.snapshot !== taskRevision(task)) return null;
  try { return validateAssessment(review.fields, task, review.locale); } catch { return null; }
}

export function breakdown(task, preview = false) {
  const review = currentAssessment(task);
  return rules.map(rule => {
    const missing = rule.keys.filter(key => !review || review.fields[key].level < 4);
    const level = review ? rule.keys.reduce((sum, key) => sum + review.fields[key].level, 0) / rule.keys.length : 0;
    return { ...rule, missing, complete: level === 4, earned: (preview || task.confirmed) ? rule.weight * level / 4 : 0 };
  });
}
export const scoreTask = (task, preview = false) => Math.round(breakdown(task, preview).reduce((sum, rule) => sum + rule.earned, 0));
