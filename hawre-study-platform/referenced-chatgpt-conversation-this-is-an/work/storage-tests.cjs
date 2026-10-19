const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve('outputs/study-platform/src');
  const storage = await import(pathToFileURL(path.join(root, 'utils/storage.js')));
  const { createPlan, adaptFuturePlan } = await import(pathToFileURL(path.join(root, 'utils/planning.js')));
  const { questions } = await import(pathToFileURL(path.join(root, 'data/questions.js')));
  const memory = new Map([['unrelated', 'preserve']]);
  const backend = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key)
  };
  global.localStorage = backend;
  const assessment = {
    step: 4, studentName: 'قوتابی', extraTexts: { q12_extra: 'بیرکاری' },
    answers: Object.fromEntries(questions.map(question => [question.id, question.options?.[0] || 'وەڵامی قوتابی']))
  };
  assert.equal(storage.persistProgress(assessment), true);
  assert.deepEqual(storage.readProgress(), assessment);
  assert.equal(storage.sanitizeAssessment({ ...assessment, answers: {} }).step, 0);
  assert.equal(storage.sanitizeAssessment({ ...assessment, extraTexts: {} }).step, 2);
  assert.equal(storage.sanitizeAssessment({ ...assessment, answers: { ...assessment.answers, q1: 0 } }).step, 0);

  const platform = storage.emptyPlatform();
  platform.profile = { grade: '١٢', subject: 'بیرکاری', dailyMinutes: 45, environment: 'noisy', works: true, goal: 'فێربوون' };
  platform.plan = createPlan(platform.profile, [45, 80, 20, 60], '2026-10-20');
  platform.plan.tasks[0] = { ...platform.plan.tasks[0], done: true, completedDate: '2026-10-21' };
  platform.plan.historyTasks = [{ ...platform.plan.tasks[0], id: 'previous-completed', date: '2026-10-18', completedDate: '2026-10-19' }];
  platform.plan = adaptFuturePlan(platform.plan, '2026-10-20');
  platform.checkins = [{ id: 'checkin-2026-10-20', date: '2026-10-20', mood: 'hard', note: 'قورس بوو', completedCount: 1 }];
  platform.sessions = [{ id: 'session-1', date: '2026-10-20', minutes: 25, subject: 'بیرکاری' }];
  platform.attempts = [{ id: 'attempt-1', date: '2026-10-20', scores: [45, 80, 20, 60] }];
  platform.tools.flashcards = [{ id: 'card-1', question: 'x'.repeat(3000), answer: 'x'.repeat(5000), subject: 'بیرکاری', status: 'known', createdAt: '2026-10-20T08:00:00.000Z' }];
  platform.tools.mistakes = [{ id: 'mistake-1', subject: 'بیرکاری', question: 'x'.repeat(5000), correction: 'y'.repeat(5000), resolved: true, createdAt: '2026-10-20T09:00:00.000Z' }];
  platform.tools.timetable = [{ id: 'schedule-1', day: 'saturday', time: '16:30', subject: 'بیرکاری' }];
  platform.preferences = { dark: true, largeText: true };
  assert.equal(storage.persistPlatform(platform), true);
  const restored = storage.readPlatform();
  for (const key of ['version', 'startDate', 'dailyMinutes', 'subject', 'goal', 'priorityIndex', 'reason', 'adjustedDates']) assert.deepEqual(restored.plan[key], platform.plan[key]);
  assert.equal(restored.plan.tasks[0].category, platform.plan.tasks[0].category);
  assert.equal(restored.plan.tasks[0].completedDate, '2026-10-21');
  assert.equal(restored.plan.historyTasks[0].completedDate, '2026-10-19');
  assert.equal(restored.plan.tasks[2].adjusted, true);
  assert.deepEqual(adaptFuturePlan(restored.plan, '2026-10-20'), restored.plan, 'same-day adaptation cannot repeat after hydration');
  assert.deepEqual(restored.tools, platform.tools, 'cards, mistakes and timetable preserve all valid user data');
  assert.deepEqual(storage.sanitizePlatform(restored), restored, 'sanitizer is idempotent');
  const backup = { application: 'hawre-study', version: 2, assessment, platform };
  assert.deepEqual(storage.readBackup(JSON.parse(JSON.stringify(backup))), { assessment, platform: restored });

  const dirty = storage.sanitizePlatform({ ...platform,
    sessions: [platform.sessions[0], { ...platform.sessions[0], minutes: 35 }, { id: 1, date: '2026-10-20', minutes: 20 }, { id: 'bad-date', date: '2026-02-29', minutes: 20 }, { id: 'leap', date: '2024-02-29', minutes: 20 }],
    checkins: [platform.checkins[0], { ...platform.checkins[0], id: 'second', mood: 'easy' }],
    tools: { ...platform.tools, timetable: [...platform.tools.timetable, { id: 'bad-time', day: 'saturday', time: '29:99', subject: 'x' }] }
  });
  assert.deepEqual(dirty.sessions.map(session => session.id), ['session-1', 'leap']);
  assert.equal(dirty.sessions[0].minutes, 35);
  assert.equal(dirty.checkins.length, 1);
  assert.equal(dirty.checkins[0].mood, 'easy');
  assert.equal(dirty.tools.timetable.length, 1);
  assert.equal(storage.sanitizePlatform({ ...platform, plan: { ...platform.plan, startDate: '2026-99-99' } }).plan, null);
  for (const value of [null, [], 42, {}, { ...backup, version: 3 }, { ...backup, platform: {} }, { ...backup, assessment: { ...assessment, answers: [] } }]) assert.throws(() => storage.readBackup(value));
  const polluted = JSON.parse('{"__proto__":{"polluted":true},"profile":{"__proto__":{"polluted":true}}}');
  assert.equal(storage.sanitizePlatform(polluted).polluted, undefined);
  assert.equal({}.polluted, undefined);

  for (const raw of ['{', 'null', '[]', '42']) {
    memory.set(storage.ASSESSMENT_KEY, raw);
    memory.set(storage.PLATFORM_KEY, raw);
    assert.deepEqual(storage.readProgress(), storage.emptyAssessment());
    assert.deepEqual(storage.readPlatform(), storage.emptyPlatform());
  }
  storage.persistProgress(assessment);
  storage.persistPlatform(platform);
  storage.clearProgress();
  storage.persistProgress(storage.emptyAssessment());
  assert.equal(memory.has(storage.ASSESSMENT_KEY), false);
  assert.equal(memory.has(storage.PLATFORM_KEY), true, 'new form preserves plan and progress');
  storage.clearAll();
  storage.persistProgress(storage.emptyAssessment());
  storage.persistPlatform(storage.emptyPlatform());
  assert.equal(memory.has(storage.ASSESSMENT_KEY), false);
  assert.equal(memory.has(storage.PLATFORM_KEY), false);
  assert.equal(memory.get('unrelated'), 'preserve');
  global.localStorage = { getItem() { throw Error('disabled'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('disabled'); } };
  assert.deepEqual(storage.readProgress(), storage.emptyAssessment());
  assert.deepEqual(storage.readPlatform(), storage.emptyPlatform());
  assert.equal(storage.persistProgress(assessment), false);
  assert.equal(storage.persistPlatform(platform), false);
  storage.clearAll();
  console.log('PASS: assessment hydration/validation, plan metadata/history/adaptation round trip, 5000-character tools data, known/resolved state, backup validation, strict dates/time/IDs, deduplication, malformed/unavailable storage, scoped reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
