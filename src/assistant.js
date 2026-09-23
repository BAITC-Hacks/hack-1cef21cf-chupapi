import { fields, hasContent } from './scoring.js';

// Contract for a future server-side AI provider. No API key belongs in the client.
export const SYSTEM_PROMPT = `Ты помогаешь бизнесу описать практическую задачу для студентов.
Вход: JSON {description: string, fields: object}. Найди недостающие сведения.
Верни JSON {questions: [{key: string, question: string}]}: минимум три уместных вопроса.
Ключи: context, description, users, data, result, success, constraints, contact, interaction.
Не добавляй факты, сроки, контакты и показатели, которых нет во входных данных.
Не выбирай команду. Карточку всегда редактирует и подтверждает человек.`;

export function validateResponse(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || !Array.isArray(data.questions) || data.questions.length < 3 || data.questions.length > 9) throw new Error('Некорректный список вопросов');
  const keys = new Set();
  for (const item of data.questions) {
    if (!item || !fields.some(f => f.key === item.key) || keys.has(item.key) || typeof item.question !== 'string' || item.question.trim().length < 10 || item.question.length > 400) throw new Error('Некорректный уточняющий вопрос');
    keys.add(item.key);
  }
  return { questions: data.questions.map(q => ({ key: q.key, question: q.question.trim() })) };
}

export function localQuestions(task) {
  const text = `${task.description || ''} ${task.context || ''}`.toLowerCase();
  const aboutLeads = /заяв|клиент|менеджер/.test(text);
  const aboutSales = /продаж|коф|спрос|списан/.test(text);
  const questions = {
    context: aboutLeads ? 'Как сейчас поступают и обрабатываются заявки? На каком этапе возникает проблема?' : 'Как вы решаете эту задачу сейчас и что именно не устраивает?',
    users: 'Кто будет пользоваться решением и какие действия им нужно выполнять?',
    data: aboutLeads ? 'Можете ли вы предоставить обезличенные примеры заявок или текущие таблицы?' : aboutSales ? 'Есть ли история продаж и остатков? В каком формате и за какой период?' : 'Какие данные, материалы или примеры вы можете передать команде?',
    result: 'Что вы хотите получить от команды: прототип, приложение, исследование или другой результат?',
    success: 'Как вы проверите, что задача решена? Опишите конкретный измеримый результат.',
    constraints: 'Какие есть сроки, требования к технологиям и ограничения на доступ к данным?',
    contact: 'Кто отвечает за задачу и как команда сможет с ним связаться?',
    interaction: 'Как часто вы готовы консультировать команду и давать обратную связь?',
  };
  const missing = Object.keys(questions).filter(key => !hasContent(task[key]));
  for (const key of Object.keys(questions)) { if (missing.length >= 3) break; if (!missing.includes(key)) missing.push(key); }
  return { questions: missing.map(key => ({ key, question: questions[key] })) };
}

// A deterministic local fallback permitted by the brief. Never fabricates answers.
export function analyze(task, providerOutput) {
  try {
    return { ...validateResponse(providerOutput ?? localQuestions(task)), fallback: false };
  } catch {
    return { ...validateResponse(localQuestions(task)), fallback: true };
  }
}
