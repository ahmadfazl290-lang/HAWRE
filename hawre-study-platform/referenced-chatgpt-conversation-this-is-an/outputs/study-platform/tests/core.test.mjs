import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../src/data/questions.js';
import { calculateScores } from '../src/utils/scoring.js';
import { isStepComplete } from '../src/utils/validation.js';
import { createPlan, adaptFuturePlan, addDays } from '../src/utils/planning.js';
import { sanitizePlatform, readBackup, emptyPlatform, emptyAssessment, persistProgress, clearProgress, ASSESSMENT_KEY } from '../src/utils/storage.js';

const answers = Object.fromEntries(questions.map(q => [q.id,q.options?.[0] || 'نییە']));
const extraTexts = { q12_extra:'بیرکاری' };
test('required answers cover all six input types and conditional text', () => {
  for (let step=0;step<4;step++) {
    assert.equal(isStepComplete(step,answers,extraTexts),true);
    for (const q of questions.filter(q => q.section===step)) assert.equal(isStepComplete(step,{...answers,[q.id]:'  '},extraTexts),false);
  }
  assert.equal(isStepComplete(2,answers,{}),false);
  const q12 = questions.find(q=>q.id==='q12');
  assert.equal(isStepComplete(2,{...answers,q12:q12.options.at(-1)},{}),true);
});
test('original score fixture stays unchanged', () => {
  assert.deepEqual(calculateScores(answers,extraTexts),[60,78,95,65]);
});
test('seven-day plans fit the budget and adapt only once each date', () => {
  for (const dailyMinutes of [10,15,30,60,180]) {
    const plan=createPlan({dailyMinutes,subject:'بیرکاری',works:false},[80,40,20,10],'2026-10-20');
    assert.equal(new Set(plan.tasks.map(t=>t.date)).size,7);
    for(const date of new Set(plan.tasks.map(t=>t.date))) assert.equal(plan.tasks.filter(t=>t.date===date).reduce((s,t)=>s+t.minutes,0),dailyMinutes);
    const adapted=adaptFuturePlan(plan,'2026-10-20');
    assert.deepEqual(adaptFuturePlan(adapted,'2026-10-20'),adapted);
    const hydrated=sanitizePlatform({...emptyPlatform(),plan:adapted});
    assert.deepEqual(hydrated.plan.adjustedDates,adapted.adjustedDates);
  }
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
});
test('backup round-trip preserves learning states and rejects invalid files', () => {
  const platform=emptyPlatform();
  platform.tools.flashcards=[{id:'card',question:'پرسیار',answer:'وەڵام',status:'known'}];
  platform.tools.mistakes=[{id:'mistake',question:'پرسیار',correction:'ڕاستکردنەوە',subject:'بیرکاری',resolved:true}];
  const backup=readBackup({application:'hawre-study',version:2,assessment:emptyAssessment(),platform});
  assert.equal(backup.platform.tools.flashcards[0].status,'known');
  assert.equal(backup.platform.tools.mistakes[0].resolved,true);
  assert.throws(()=>readBackup({application:'unknown'}));
});
test('new form remains removed after persistence and leaves other keys alone', () => {
  const entries=new Map([['other','keep']]);
  globalThis.localStorage={setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
  persistProgress({step:1,answers,extraTexts,studentName:''});
  assert.equal(entries.has(ASSESSMENT_KEY),true);
  clearProgress();persistProgress(emptyAssessment());
  assert.equal(entries.has(ASSESSMENT_KEY),false);assert.equal(entries.get('other'),'keep');
});
