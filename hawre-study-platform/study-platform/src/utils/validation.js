import { questions, sections } from '../data/questions.js';
export function requiresExtraText(q, value) {
  return q.type === 'radio-text' && q.options.includes(value) && value !== q.options.at(-1);
}
export function isQuestionComplete(q, answers, extraTexts = {}) {
  const value = answers[q.id];
  if (typeof value !== 'string' || !value.trim()) return false;
  if (q.options && !q.options.includes(value)) return false;
  return !requiresExtraText(q, value) || (typeof extraTexts[q.id + '_extra'] === 'string' && Boolean(extraTexts[q.id + '_extra'].trim()));
}
export function isStepComplete(step, answers, extraTexts = {}) {
  return Number.isInteger(step) && step >= 0 && step < sections.length &&
    questions.filter(q => q.section === step).every(q => isQuestionComplete(q, answers, extraTexts));
}
