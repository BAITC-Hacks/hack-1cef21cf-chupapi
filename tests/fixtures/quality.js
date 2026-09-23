// Synthetic examples shared by unit checks and the opt-in live regression check.
export const weakTask = {
  title: 'Сайт', category: 'Веб-разработка', weeks: '3 недели',
  description: 'Хотим сделать сайт для нашего бизнеса. Пока не определились, что именно на нём должно быть. Нужна помощь студентов.',
  context: 'Ну просто нужен сайт', users: 'Для всех', data: 'Еще в процессе',
  result: 'Нууу отзывчивость', success: 'Главное чтобы в дедлафн успели', constraints: 'Не-а',
  contact: 'Айдана · qadam@example.com (демо)', interaction: 'Созвон раз в неделю, обратная связь в течение двух дней.',
};
export const strongTask = {
  title: 'Учёт заявок учебного центра', category: 'Веб-разработка', weeks: '3 недели',
  description: 'Собрать заявки из отдельных таблиц в одном приложении, чтобы менеджеры не теряли обращения.',
  context: 'Три менеджера ведут отдельные таблицы; заявки из мессенджеров теряются при передаче между менеджерами.',
  users: 'Три менеджера по продажам и руководитель учебного центра.',
  data: 'Передадим обезличенный CSV с 200 заявками, описание полей и примеры таблиц в первый день.',
  result: 'Работающий веб-прототип со списком заявок, поиском, статусами и назначением ответственного; исходный код и инструкция.',
  success: 'Все 200 заявок импортируются без потерь и дублей. Поиск занимает не более двух секунд, статус сохраняется после перезагрузки.',
  constraints: 'Три недели, без платных сервисов. Только обезличенные данные. Интеграции с мессенджерами не входят в первую версию.',
  contact: 'Координатор Айдана, Telegram @qadam_project_lead',
  interaction: 'Созвон раз в неделю, ответы на вопросы в течение одного рабочего дня.',
};

// Explicit test double, not a local scoring algorithm.
export const strongReview = Object.fromEntries(Object.entries(strongTask).filter(([key]) => !['title', 'category', 'weeks'].includes(key)).map(([key, text]) => [key, {
  level: 4, reason: 'Указаны конкретные сведения для работы команды.', evidence: [text],
}]));
export const weakReview = Object.fromEntries(Object.entries(strongReview).map(([key]) => [key, {
  level: key === 'interaction' ? 4 : 0,
  reason: key === 'interaction' ? 'Указаны ритм созвонов и срок ответа.' : 'Уточните конкретные сведения вместо общего ответа.',
  evidence: key === 'interaction' ? [weakTask[key]] : [],
}]));

export const partialTask = {
  ...strongTask,
  data: 'Есть таблица с заявками, но формат и доступ нужно согласовать.',
  result: 'Нужен сайт со списком заявок.',
  success: 'Менеджеры должны находить заявки быстрее.',
  constraints: 'Хотелось бы закончить примерно через месяц.',
  contact: 'Айдана', interaction: 'Готовы встречаться раз в неделю.',
};
export const nearlyTask = {
  ...strongTask,
  data: 'Есть выгрузка CSV из 200 заявок; персональные данные пока не удалены.',
  success: 'Проверим импорт CSV и изменение статусов вручную, скорость пока не определили.',
};
