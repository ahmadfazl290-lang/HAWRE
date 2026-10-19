import { questions, sections } from '../data/questions.js';
import { isStepComplete } from './validation.js';

export const ASSESSMENT_KEY = 'sorani-study-assessment:v1';
export const PLATFORM_KEY = 'hawre-study-platform:v2';
export const emptyAssessment = () => ({ step: 0, answers: {}, extraTexts: {}, studentName: '' });
export const emptyPlatform = () => ({
  profile: { grade: '', subject: '', dailyMinutes: 30, environment: 'shared', works: false, goal: '' },
  plan: null, checkins: [], sessions: [], attempts: [],
  tools: { flashcards: [], mistakes: [], timetable: [] },
  preferences: { largeText: false, dark: false }
});

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 5000) => typeof value === 'string' ? value.slice(0, max) : '';
const number = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const integer = (value, min, max, fallback) => Math.round(number(value, min, max, fallback));
const id = value => text(value, 100).trim();
const list = (value, max = 1000) => Array.isArray(value) ? value.filter(record).slice(-max) : [];
const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Check actual calendar dates, including leap years and month lengths.
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const candidate = new Date(0);
  candidate.setUTCFullYear(year, month - 1, day);
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day ? value : '';
}
const timestamp = value => typeof value === 'string' && value.length <= 50 && Number.isFinite(Date.parse(value)) ? value : '';
const time = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '';

// Keep the newest entry per ID so malformed backups cannot produce duplicate UI keys.
function unique(items, key = item => item.id) {
  const entries = new Map();
  for (const item of items) if (item.id && key(item)) entries.set(key(item), item);
  return [...entries.values()];
}

export function sanitizeAssessment(saved) {
  const state = emptyAssessment();
  if (!record(saved)) return state;
  for (const question of questions) {
    const value = saved.answers?.[question.id];
    if (typeof value === 'string' && (!question.options || question.options.includes(value))) state.answers[question.id] = text(value, 10000);
    const key = question.id + '_extra';
    if (question.type === 'radio-text' && typeof saved.extraTexts?.[key] === 'string') state.extraTexts[key] = text(saved.extraTexts[key]);
  }
  state.studentName = text(saved.studentName, 100);
  const requested = Number.isInteger(saved.step) ? Math.max(0, Math.min(sections.length, saved.step)) : 0;
  while (state.step < requested && isStepComplete(state.step, state.answers, state.extraTexts)) state.step++;
  return state;
}

function sanitizeTasks(value, max) {
  return unique(list(value, max).map(task => ({
    id: id(task.id), date: date(task.date), title: text(task.title, 500),
    minutes: integer(task.minutes, 1, 180, 10), done: task.done === true,
    why: text(task.why, 500), category: integer(task.category, 0, 3, 0),
    dayIndex: integer(task.dayIndex, 0, 6, 0),
    completedDate: task.done === true ? date(task.completedDate) || date(task.date) : null,
    ...(task.adjusted === true ? { adjusted: true } : {})
  })).filter(task => task.id && task.date && task.title.trim()));
}

export function sanitizePlatform(saved) {
  const state = emptyPlatform();
  if (!record(saved)) return state;
  const profile = record(saved.profile) ? saved.profile : {};
  state.profile = {
    grade: text(profile.grade, 80), subject: text(profile.subject, 100),
    dailyMinutes: integer(profile.dailyMinutes, 10, 180, 30),
    environment: ['quiet', 'shared', 'noisy'].includes(profile.environment) ? profile.environment : 'shared',
    works: profile.works === true, goal: text(profile.goal, 500)
  };
  state.preferences = { dark: saved.preferences?.dark === true, largeText: saved.preferences?.largeText === true };
  state.sessions = unique(list(saved.sessions).filter(session => Number.isFinite(session.minutes)).map(session => ({
    id: id(session.id), date: date(session.date), minutes: integer(session.minutes, 1, 180, 25), subject: text(session.subject, 160)
  })).filter(session => session.id && session.date));
  state.checkins = unique(list(saved.checkins, 365).map(checkin => ({
    id: id(checkin.id), date: date(checkin.date), mood: checkin.mood,
    note: text(checkin.note), completedCount: integer(checkin.completedCount, 0, 1000, 0)
  })).filter(checkin => checkin.id && checkin.date && ['easy', 'okay', 'hard'].includes(checkin.mood)), checkin => checkin.date);
  state.attempts = unique(list(saved.attempts, 100).filter(attempt => Array.isArray(attempt.scores) && attempt.scores.length === sections.length && attempt.scores.every(score => Number.isFinite(score) && score >= 0 && score <= 100)).map(attempt => ({
    id: id(attempt.id), date: date(attempt.date), scores: [...attempt.scores]
  })).filter(attempt => attempt.id && attempt.date));

  if (record(saved.plan) && date(saved.plan.startDate)) {
    const plan = saved.plan;
    const tasks = sanitizeTasks(plan.tasks, 21);
    const currentIds = new Set(tasks.map(task => task.id));
    state.plan = {
      version: 1, startDate: date(plan.startDate),
      dailyMinutes: integer(plan.dailyMinutes, 10, 180, state.profile.dailyMinutes),
      subject: text(plan.subject, 100) || state.profile.subject,
      goal: text(plan.goal, 500), priorityIndex: integer(plan.priorityIndex, 0, 3, 0),
      reason: text(plan.reason, 1000), tasks,
      historyTasks: sanitizeTasks(plan.historyTasks, 300).filter(task => task.done && !currentIds.has(task.id)),
      adjustedDates: Array.isArray(plan.adjustedDates) ? [...new Set(plan.adjustedDates.map(date).filter(Boolean))].slice(-60) : []
    };
  }

  const tools = record(saved.tools) ? saved.tools : {};
  // Rendered as plain text; only known data fields enter application state.
  state.tools.flashcards = unique(list(tools.flashcards, 500).map(card => ({
    id: id(card.id), question: text(card.question, 3000), answer: text(card.answer),
    subject: text(card.subject, 120), status: card.status === 'known' || card.known === true ? 'known' : 'review',
    ...(timestamp(card.createdAt) ? { createdAt: timestamp(card.createdAt) } : {})
  })).filter(card => card.id && card.question.trim() && card.answer.trim()));
  state.tools.mistakes = unique(list(tools.mistakes, 500).map(mistake => ({
    id: id(mistake.id), subject: text(mistake.subject, 120),
    question: text(mistake.question), correction: text(mistake.correction), resolved: mistake.resolved === true,
    ...(timestamp(mistake.createdAt) ? { createdAt: timestamp(mistake.createdAt) } : {})
  })).filter(mistake => mistake.id && mistake.question.trim() && mistake.correction.trim()));
  state.tools.timetable = unique(list(tools.timetable, 100).map(entry => ({
    id: id(entry.id), day: days.includes(entry.day) ? entry.day : '',
    subject: text(entry.subject, 200), time: time(entry.time)
  })).filter(entry => entry.id && entry.day && entry.time && entry.subject.trim()));
  return state;
}

function read(key, clean) { try { return clean(JSON.parse(localStorage.getItem(key))); } catch { return clean(null); } }
export const readProgress = () => read(ASSESSMENT_KEY, sanitizeAssessment);
export const readPlatform = () => read(PLATFORM_KEY, sanitizePlatform);
export function persistProgress(state) {
  try {
    if (state.step === 0 && !state.studentName && !Object.keys(state.answers).length && !Object.keys(state.extraTexts).length) localStorage.removeItem(ASSESSMENT_KEY);
    else localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}
export function persistPlatform(state) {
  try {
    if (JSON.stringify(state) === JSON.stringify(emptyPlatform())) localStorage.removeItem(PLATFORM_KEY);
    else localStorage.setItem(PLATFORM_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}
export function clearProgress() { try { localStorage.removeItem(ASSESSMENT_KEY); } catch {} }
export function clearAll() { clearProgress(); try { localStorage.removeItem(PLATFORM_KEY); } catch {} }

export function readBackup(data) {
  const assessment = data?.assessment;
  const platform = data?.platform;
  if (!record(data) || data.application !== 'hawre-study' || data.version !== 2 ||
      !record(assessment) || !record(assessment.answers) || !record(assessment.extraTexts) ||
      !Number.isInteger(assessment.step) || assessment.step < 0 || assessment.step > sections.length || typeof assessment.studentName !== 'string' ||
      !record(platform) || !record(platform.profile) || !record(platform.preferences) || !record(platform.tools) ||
      !['sessions', 'checkins', 'attempts'].every(key => Array.isArray(platform[key])) ||
      !['flashcards', 'mistakes', 'timetable'].every(key => Array.isArray(platform.tools[key])) ||
      !(platform.plan === null || (record(platform.plan) && date(platform.plan.startDate) && Array.isArray(platform.plan.tasks)))) {
    throw Error('Invalid backup');
  }
  return { assessment: sanitizeAssessment(assessment), platform: sanitizePlatform(platform) };
}
