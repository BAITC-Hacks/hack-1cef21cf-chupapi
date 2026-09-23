// One synthetic dataset for the app and the hackathon submission.
import dataset from '../data/demo.json' with { type: 'json' };

export const demoData = dataset;
export const tasks = dataset.tasks;
export const readiness = score => score >= 90 ? 'Приоритетная' : score >= 70 ? 'Готовая' : score >= 40 ? 'Рабочая' : 'Требует уточнения';
