import { cleanTask, fallbackCard } from './ai-contract.js';
import { localQuestions, validateResponse } from './assistant.js';
import { currentAssessment } from './scoring.js';
import { getLocale, tr } from './i18n.js';

export async function requestAssistant(kind, task, signal) {
  const input = cleanTask(task);
  const locale = getLocale();
  const fallback = (reason, notice) => ({ mode: 'local', locale, reason, notice: tr(notice, {}, locale),
    ...(kind === 'questions' ? localQuestions(input, locale) : { ...(kind === 'card' ? { card: fallbackCard(input) } : {}), assessment: null, score: null }) });
  try {
    const response = await fetch(`/api/ai/${kind}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: input, locale }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000),
    });
    if (!response.ok) {
      if (response.status === 429) return fallback('rate_limit', 'Слишком много запросов. Подождите минуту и повторите проверку.');
      if (response.status === 404) return fallback('server_missing', 'Сервис AI не найден. Проверьте, что сервер приложения запущен.');
      if (response.status === 400 || response.status === 413) return fallback('invalid_input', 'Проверьте длину описания и полей карточки. Ответы сохранены.');
      throw new Error('AI недоступен');
    }
    const result = await response.json();
    if (!['local', 'openai'].includes(result.mode)) throw new Error('Неизвестный режим');
    if (kind === 'questions') validateResponse(result);
    else {
      if (kind === 'card' && (!result.card || typeof result.card.description !== 'string')) throw new Error('Некорректная карточка');
      const cardWithoutReview = kind === 'card' && result.assessment === null && result.assessmentStatus === 'unavailable';
      if (result.mode === 'openai' && !cardWithoutReview && !currentAssessment({ ...input, ...result.card, assessment: result.assessment })) return fallback('invalid_response', 'Не удалось проверить оценку AI. Повторите запрос; ответы сохранены.');
    }
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    return error.name === 'TimeoutError' ? fallback('timeout', 'AI не успел ответить. Повторите проверку; ответы сохранены.') : fallback('unavailable', 'Не удалось связаться с AI-сервером. Повторите проверку; ответы сохранены.');
  }
}
