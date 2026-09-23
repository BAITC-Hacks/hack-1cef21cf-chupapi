import { fields, containsSource } from './scoring.js';

export const cardKeys = ['title', ...fields.map(field => field.key)];
export const inputKeys = [...cardKeys, 'category', 'weeks'];

export function cleanTask(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Передайте описание задачи');
  const task = {};
  for (const key of inputKeys) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > 5000) throw new Error('Поле слишком длинное или имеет неверный формат');
    if (key === 'title' && value.trim().length > 120) throw new Error('Сократите название до 120 символов');
    task[key] = value.trim();
  }
  if (task.description.length < 15) throw new Error('Опишите задачу подробнее — минимум 15 символов');
  if (Object.values(task).join('').length > 25000) throw new Error('Сократите описание до 25 000 символов');
  return task;
}

export const questionSchema = {
  type: 'object', additionalProperties: false, required: ['questions'],
  properties: { questions: {
    type: 'array', minItems: 3, maxItems: 6,
    items: { type: 'object', additionalProperties: false, required: ['key', 'question'], properties: {
      key: { type: 'string', enum: fields.map(field => field.key) },
      question: { type: 'string' },
    } },
  } },
};

// The model organizes original fragments, rather than inventing or paraphrasing facts.
export const assessmentSchema = {
  type: 'object', additionalProperties: false, required: fields.map(f => f.key),
  properties: Object.fromEntries(fields.map(({key}) => [key, {
    type: 'object', additionalProperties: false, required: ['level', 'reason', 'evidence'],
    properties: {
      level: { type: 'integer', enum: [0, 1, 2, 3, 4] },
      reason: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    },
  }])),
};
export const reviewSchema = { type: 'object', additionalProperties: false, required: ['assessment'], properties: { assessment: assessmentSchema } };
export const cardSchema = {
  type: 'object', additionalProperties: false, required: ['card', 'assessment'],
  properties: { card: {
    type: 'object', additionalProperties: false, required: cardKeys,
    properties: Object.fromEntries(cardKeys.map(key => [key, { type: 'array', items: { type: 'string' }, maxItems: 4 }])),
  }, assessment: assessmentSchema },
};

export function fallbackCard(task) {
  const card = Object.fromEntries(cardKeys.map(key => [key, task[key] || '']));
  if (!card.title) card.title = task.description.split(/[.!?\n]/)[0].slice(0, 120).trim();
  return card;
}

export function validateCard(output, task) {
  const data = typeof output === 'string' ? JSON.parse(output) : output;
  if (!data?.card || Array.isArray(data.card) || typeof data.card !== 'object') throw new Error('Некорректная карточка');
  if (Object.keys(data.card).some(key => !cardKeys.includes(key))) throw new Error('Неизвестное поле карточки');
  const source = Object.values(task).filter(value => typeof value === 'string' && value.trim());
  const card = {};
  for (const key of cardKeys) {
    const fragments = data.card[key];
    if (!Array.isArray(fragments) || fragments.length > 4) throw new Error('Некорректные фрагменты карточки');
    // Explicit answers are authoritative. Ignore unnecessary model copies of them.
    if (task[key]) { card[key] = task[key]; continue; }
    for (const fragment of fragments) {
      if (typeof fragment !== 'string' || !fragment.trim() || fragment.length > 5000 || !source.some(text => containsSource(text, fragment))) {
        throw new Error('Карточка содержит сведения, которых нет в ответах');
      }
    }
    // Never overwrite explicit field answers; only fill missing fields from the description.
    card[key] = task[key] || [...new Set(fragments.map(text => text.trim()))].join('\n');
    if (card[key].length > (key === 'title' ? 120 : 5000)) throw new Error('Слишком длинное поле карточки');
  }
  if (!card.title) card.title = fallbackCard(task).title;
  return card;
}
