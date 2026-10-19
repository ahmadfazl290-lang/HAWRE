const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { createRequire } = require('module');
const deps = path.resolve('C:/Users/HP/Documents/Codex/2026-10-16/hi-i-speak-a-decent-language/outputs/cadence-web/node_modules');
const req = createRequire(fs.realpathSync(path.join(deps, 'vite/package.json')));
const esbuild = req('esbuild');
const root = path.resolve('outputs/study-app');
const vm = require('vm');
function moduleAt(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const { code } = esbuild.transformSync(source, { format: 'cjs', loader: 'js' });
  const mod = { exports: {} }; vm.runInNewContext(code, { module: mod, exports: mod.exports, window: global.window,
    require: relative => moduleAt(path.relative(root, path.resolve(root, path.dirname(file), relative))) }); return mod.exports;
}
const memory = new Map([['unrelated', 'preserve']]);
global.window = { localStorage: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) } };
const { questions } = moduleAt('src/data/questions.js');
const { isStepComplete, isQuestionComplete } = moduleAt('src/utils/validation.js');
const storage = moduleAt('src/utils/storage.js');
const scoring = moduleAt('src/utils/scoring.js');
const answers = Object.fromEntries(questions.map(q => [q.id, q.options?.[0] || 'وەڵامی قوتابی']));
const extraTexts = { q12_extra: 'بیرکاری' };
for (let step = 0; step < 4; step++) {
  assert.equal(isStepComplete(step, answers, extraTexts), true);
  for (const q of questions.filter(q => q.section === step)) {
    assert.equal(isStepComplete(step, { ...answers, [q.id]: '' }, extraTexts), false);
    assert.equal(isStepComplete(step, { ...answers, [q.id]: '   ' }, extraTexts), false);
    if (q.options) assert.equal(isQuestionComplete(q, { ...answers, [q.id]: 'invalid' }, extraTexts), false);
  }
}
assert.equal(isStepComplete(2, answers, {}), false);
assert.equal(isStepComplete(2, { ...answers, q12: questions.find(q => q.id === 'q12').options.at(-1) }, {}), true);
const state = { step: 4, answers, extraTexts, studentName: 'قوتابی' };
storage.persistProgress(state);
assert.equal(JSON.stringify(storage.readProgress()), JSON.stringify(state));
memory.set(storage.STORAGE_KEY, JSON.stringify({ ...state, answers: {} }));
assert.equal(storage.readProgress().step, 0);
for (const bad of ['{', 'null', '[]', '42']) { memory.set(storage.STORAGE_KEY, bad); assert.equal(storage.readProgress().step, 0); }
storage.clearProgress(); storage.persistProgress({ step: 0, answers: {}, extraTexts: {}, studentName: '' });
assert.equal(memory.has(storage.STORAGE_KEY), false);
assert.equal(memory.get('unrelated'), 'preserve');
const source = fs.readFileSync('C:/Users/HP/Downloads/Telegram Desktop/App.jsx.txt', 'utf8');
const reference = source.slice(source.indexOf('function scoreForAnswer'), source.indexOf('export default function App'));
const oldScore = vm.runInNewContext(reference + '; scoreForAnswer');
for (const q of questions) for (const value of [...(q.options || []), '', ' ', 'x'.repeat(19), 'x'.repeat(40), 'x'.repeat(90)]) {
  assert.equal(scoring.scoreForAnswer(q.id, value), oldScore(q.id, value));
}
const normalized = source.replace(/\r\n/g, '\n');
const start = normalized.indexOf('    const s = [');
const end = normalized.indexOf('  }, [answers, extraTexts]);', start);
const originalCalculation = new Function('questions', 'scoreForAnswer', 'answers', 'extraTexts', normalized.slice(start, end));
for (let n = 0; n < 100; n++) {
  const sample = Object.fromEntries(questions.map((q, i) => [q.id, q.options ? q.options[(n + i) % q.options.length] : 'x'.repeat(n)]));
  const extra = { q12_extra: 'x'.repeat(n % 10) };
  assert.equal(JSON.stringify(scoring.calculateScores(sample, extra)), JSON.stringify(originalCalculation(questions, oldScore, sample, extra)));
}
const broken = moduleAt('src/utils/storage.js');
global.window.localStorage.getItem = () => { throw Error('disabled'); };
assert.equal(broken.readProgress().step, 0);
for (const file of ['src/App.jsx', 'src/components/QuestionsForm.jsx', 'src/components/ReportCard.jsx']) {
  esbuild.transformSync(fs.readFileSync(path.join(root, file), 'utf8'), { loader: 'jsx', jsx: 'automatic' });
}
console.log('PASS: JSX compilation, validation for all six input types, storage hydration/reset, malformed storage, unavailable storage, scoring parity (100 answer sets).');
