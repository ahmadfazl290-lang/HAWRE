import { learningTopics, learningTopicById } from '../data/learningTopics.js';

export const LEARNING_STAGES = ['baseline', 'example', 'guided', 'practice', 'reflection', 'followup', 'complete'];
export const FOLLOWUP_DELAY_MS = 24 * 60 * 60 * 1000;

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const boundedInteger = (value, min, max, fallback = min) => Number.isInteger(value) && value >= min && value <= max ? value : fallback;
const safeDate = value => {
  if (typeof value !== 'string' || value.length > 32 || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
};

export function isValidChoice(question, value) {
  return Number.isInteger(value) && value >= -1 && value < question.options.length;
}

export function allQuestionsAnswered(questions, answers) {
  return record(answers) && questions.every(question => isValidChoice(question, answers[question.id]));
}

export function scoreQuestions(questions, answers = {}) {
  return {
    correct: questions.filter(question => answers[question.id] === question.correctIndex).length,
    answered: questions.filter(question => isValidChoice(question, answers[question.id])).length,
    total: questions.length,
  };
}

export function createLearningTopicState() {
  return {
    stage: 'baseline',
    baseline: { answers: {}, confidence: {}, completedAt: '' },
    exampleViewed: false,
    guided: { answer: null, submitted: false, attempts: 0, hintLevel: 0 },
    practice: { answers: {}, completedAt: '' },
    reflection: '',
    reflectionChecked: false,
    followup: { answers: {}, confidence: {}, completedAt: '' },
    followupDueAt: '',
    lastWorkedAt: '',
  };
}

export function createLearningState() {
  return {
    activeTopic: learningTopics[0].id,
    topics: Object.fromEntries(learningTopics.map(topic => [topic.id, createLearningTopicState()])),
  };
}

function sanitizeSnapshot(value, questions, includeConfidence = false) {
  const source = record(value) ? value : {};
  const answers = {};
  const confidence = {};
  for (const question of questions) {
    if (record(source.answers) && isValidChoice(question, source.answers[question.id])) answers[question.id] = source.answers[question.id];
    if (includeConfidence && record(source.confidence) && [1, 2, 3].includes(source.confidence[question.id])) confidence[question.id] = source.confidence[question.id];
  }
  const completedAt = allQuestionsAnswered(questions, answers) ? safeDate(source.completedAt) : '';
  return includeConfidence ? { answers, confidence, completedAt } : { answers, completedAt };
}

export function followupDueAt(practiceCompletedAt) {
  const valid = safeDate(practiceCompletedAt);
  return valid ? new Date(new Date(valid).getTime() + FOLLOWUP_DELAY_MS).toISOString() : '';
}

/** Allow-list fields and question IDs so old or imported backups stay bounded. */
export function sanitizeLearning(value) {
  const source = record(value) ? value : {};
  const next = createLearningState();
  if (typeof source.activeTopic === 'string' && Object.hasOwn(learningTopicById, source.activeTopic)) next.activeTopic = source.activeTopic;
  for (const topic of learningTopics) {
    const raw = record(source.topics) && record(source.topics[topic.id]) ? source.topics[topic.id] : {};
    const state = createLearningTopicState();
    state.baseline = sanitizeSnapshot(raw.baseline, topic.baseline, true);
    state.exampleViewed = raw.exampleViewed === true;
    const guided = record(raw.guided) ? raw.guided : {};
    state.guided = {
      answer: isValidChoice(topic.guided, guided.answer) ? guided.answer : null,
      submitted: guided.submitted === true && isValidChoice(topic.guided, guided.answer),
      attempts: boundedInteger(guided.attempts, 0, 50, 0),
      hintLevel: boundedInteger(guided.hintLevel, 0, topic.guided.hints.length, 0),
    };
    state.practice = sanitizeSnapshot(raw.practice, topic.practice);
    state.reflection = typeof raw.reflection === 'string' ? raw.reflection.slice(0, 4000) : '';
    state.reflectionChecked = raw.reflectionChecked === true && Boolean(state.reflection.trim());
    state.followup = sanitizeSnapshot(raw.followup, topic.followup, true);
    state.followupDueAt = followupDueAt(state.practice.completedAt);
    state.lastWorkedAt = safeDate(raw.lastWorkedAt);

    let maxStage = 0;
    if (state.baseline.completedAt) maxStage = 1;
    if (maxStage === 1 && state.exampleViewed) maxStage = 2;
    if (maxStage === 2 && state.guided.submitted) maxStage = 3;
    if (maxStage === 3 && state.practice.completedAt) maxStage = 4;
    if (maxStage === 4 && state.reflectionChecked) maxStage = 5;
    if (maxStage === 5 && state.followup.completedAt) maxStage = 6;
    const requestedStage = LEARNING_STAGES.indexOf(raw.stage);
    state.stage = LEARNING_STAGES[Math.min(Math.max(0, requestedStage), maxStage)];
    next.topics[topic.id] = state;
  }
  return next;
}

export function isFollowupDue(state, now = Date.now()) {
  const due = state?.followupDueAt;
  return Boolean(due) && Number.isFinite(new Date(due).getTime()) && now >= new Date(due).getTime();
}

export function summarizeLearning(value) {
  const learning = sanitizeLearning(value);
  const summary = {
    startedTopics: 0,
    baselineCompletedTopics: 0,
    practiceCompletedTopics: 0,
    followupCompletedTopics: 0,
    completedTopics: 0,
    independentCorrect: 0,
    independentTotal: 0,
    independentGoalMetTopics: 0,
    comparisons: [],
  };
  for (const topic of learningTopics) {
    const state = learning.topics[topic.id];
    if (Object.keys(state.baseline.answers).length || state.lastWorkedAt) summary.startedTopics += 1;
    if (state.baseline.completedAt) summary.baselineCompletedTopics += 1;
    if (state.practice.completedAt) {
      const score = scoreQuestions(topic.practice, state.practice.answers);
      summary.practiceCompletedTopics += 1;
      summary.independentCorrect += score.correct;
      summary.independentTotal += score.total;
      if (score.correct >= 2) summary.independentGoalMetTopics += 1;
    }
    if (state.followup.completedAt) summary.followupCompletedTopics += 1;
    if (state.stage === 'complete') summary.completedTopics += 1;
    if (state.baseline.completedAt && state.followup.completedAt) {
      const before = scoreQuestions(topic.baseline, state.baseline.answers);
      const after = scoreQuestions(topic.followup, state.followup.answers);
      summary.comparisons.push({
        topicId: topic.id, title: topic.title,
        baselineCorrect: before.correct, followupCorrect: after.correct,
        total: before.total, change: after.correct - before.correct,
        baselineAt: state.baseline.completedAt, followupAt: state.followup.completedAt,
      });
    }
  }
  return summary;
}
