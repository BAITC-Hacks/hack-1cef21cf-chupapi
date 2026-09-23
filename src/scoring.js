// A transparent completeness score, not a judgement of the business or idea.
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
  const text = typeof value === 'string' ? value.trim() : '';
  return /[\p{L}\p{N}]/u.test(text) && !/^(уточняется|пока не|не знаю|не указан|нет данных|tbd|n\/a|позже|неизвестно)/i.test(text);
}
export function breakdown(task, preview = false) {
  return rules.map(rule => {
    const missing = rule.keys.filter(key => !hasContent(task[key]));
    const complete = missing.length === 0;
    return { ...rule, missing, complete, earned: complete && (preview || task.confirmed) ? rule.weight : 0 };
  });
}
export const scoreTask = (task, preview = false) => breakdown(task, preview).reduce((sum, rule) => sum + rule.earned, 0);
