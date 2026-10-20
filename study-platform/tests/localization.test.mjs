import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANGUAGES,isLocale,languageInfo,translate,translateAnswer,translatePlanText} from '../src/i18n/runtime.js';
import {createPlan,displayDate} from '../src/utils/planning.js';
import {sanitizePlatform,emptyPlatform} from '../src/utils/storage.js';
import {localizedField} from '../src/utils/authoredText.js';
import {learningTopics} from '../src/data/learningTopics.js';
import {questions} from '../src/data/questions.js';

const codes=['en','kmr','ar','fa'];
const catalogs=Object.fromEntries(codes.map(code=>[
  code,JSON.parse(readFileSync(new URL(`../src/i18n/${code}.json`,import.meta.url),'utf8'))
]));
const sourceKeys=Object.keys(catalogs.en);
const tokens=value=>(value.match(/\{p\d+\}/g)||[]).sort();

test('all four translated catalogs contain every source message',()=>{
  assert.equal(sourceKeys.length,767,'Update the expected count when intentionally adding source messages');
  for(const key of ['هاوڕێ','بیرکاری','ئامرازەکانی خوێندن','🖨 چاپ / پاشەکەوت وەک PDF']){
    assert.ok(sourceKeys.includes(key),`Missing source message: ${key}`);
  }
  const expected=[...sourceKeys].sort();
  for(const code of codes){
    assert.deepEqual(Object.keys(catalogs[code]).sort(),expected,`${code} source keys differ`);
    for(const key of sourceKeys){
      assert.equal(typeof catalogs[code][key],'string',`${code}: ${key}`);
      assert.ok(catalogs[code][key].trim().length>0,`${code} has an empty translation: ${key}`);
    }
  }
});

test('translations preserve the exact placeholder multiset, including repeated tokens',()=>{
  for(const key of sourceKeys){
    const expected=tokens(key);
    assert.deepEqual(tokens(catalogs.en[key]),expected,`English source placeholders changed: ${key}`);
    for(const code of codes){
      assert.deepEqual(tokens(catalogs[code][key]),tokens(catalogs.en[key]),`${code} placeholders changed: ${key}`);
    }
  }
});

test('English and Latin Kurmanji have no untranslated Sorani script',()=>{
  for(const code of ['en','kmr']){
    for(const [key,value] of Object.entries(catalogs[code])){
      assert.doesNotMatch(value,/[\u0620-\u064a\u066e-\u06d3\u06fa-\u06ff]/,`${code} contains a script fallback: ${key}`);
    }
  }
});

test('answer translation changes declared choices and preserves authored free text',()=>{
  const choiceQuestion=questions.find(question=>question.options?.length);
  const choice=choiceQuestion.options[0];
  const freeTextQuestions=questions.filter(question=>['textarea','textarea-big'].includes(question.type));
  assert.ok(freeTextQuestions.length>0,'Exercise actual free-text question types');
  // These authored values deliberately equal app catalog keys.
  const authoredValues=['بیرکاری','پێشکەوتن','سڕینەوە','هاوڕێ'];
  for(const code of ['ckb',...codes]){
    assert.equal(translateAnswer(choiceQuestion,choice,code),translate(choice,code));
    for(const question of freeTextQuestions){
      for(const authored of authoredValues){
        assert.equal(translateAnswer(question,authored,code),authored,`${code} rewrote student free text`);
      }
    }
    assert.equal(translateAnswer(choiceQuestion,'My own answer / وەڵامی خۆم',code),'My own answer / وەڵامی خۆم');
    assert.equal(translateAnswer(undefined,'بیرکاری',code),'بیرکاری');
  }
});

test('dynamic plan translation preserves authored subjects even when they match UI text',()=>{
  const planTemplates=[
    'لە {p0} ئەرکێکی بچووک هەڵبژێرە، کاتی دەستپێکردنی بنووسە و دەستی پێ بکە.',
    'بەشێکی {p0} بکە بە دوو هەنگاو؛ هەنگاوی یەکەم ئەمڕۆ تەواو بکە.',
    'لە خشتەکەت کاتێکی گونجاو بۆ {p0} دیاری بکە و تەنها یەک ئەرک بکە.',
    'بەبێ سەیرکردنی کتێب، دوو خاڵ لە {p0} بنووسە؛ پاشان بپشکنە.'
  ];
  for(const code of codes){
    for(const subject of ['بیرکاری','پێشکەوتن','My subject / وانەی من']){
      for(const key of planTemplates){
        const source=key.replace('{p0}',subject);
        const expected=catalogs[code][key].replace('{p0}',subject);
        assert.equal(translate(source,code),expected,`${code} rewrote an authored subject in ${key}`);
      }
    }
    const key='{p0} پاشان یەک بەشی کورتی {p1} بخوێنە.';
    const prefix='ئامادەکردنی خوێندن';
    const subject='بیرکاری';
    const source=key.replace('{p0}',prefix).replace('{p1}',subject);
    const expected=catalogs[code][key].replace('{p0}',catalogs[code][prefix]).replace('{p1}',subject);
    assert.equal(translate(source,code),expected,`${code} did not distinguish app text from an authored subject`);
  }
});

test('language metadata has the requested five locales and matching text directions',()=>{
  const expected={ckb:'rtl',kmr:'ltr',ar:'rtl',en:'ltr',fa:'rtl'};
  assert.equal(LANGUAGES.length,5);
  assert.deepEqual(Object.fromEntries(LANGUAGES.map(language=>[language.code,language.direction])),expected);
  for(const [code,direction] of Object.entries(expected)){
    assert.equal(isLocale(code),true);
    assert.equal(languageInfo(code).direction,direction);
    assert.ok(languageInfo(code).label.length>0);
  }
  assert.equal(isLocale('unknown'),false);
  assert.equal(languageInfo('unknown').code,'ckb');
});

test('generated profile and plan labels localize after hydration while typed subjects remain raw',()=>{
  const topic=learningTopics[0];
  const profile={...emptyPlatform().profile,subject:`${topic.subject} — ${topic.title}`,goal:topic.goal,sourceUI:{subject:topic.id,goal:topic.id}};
  const saved=sanitizePlatform({profile,plan:createPlan(profile,[], '2026-10-20')});
  assert.deepEqual(saved.profile.sourceUI,profile.sourceUI);
  assert.deepEqual(saved.plan.sourceUI,profile.sourceUI);
  for(const code of codes){
    const t=value=>translate(value,code);
    assert.equal(localizedField(saved.profile,'goal',t),t(topic.goal));
    const label=localizedField(saved.plan,'subject',t);
    assert.equal(label,`${t(topic.subject)} — ${t(topic.title)}`);
    assert.ok(translatePlanText(saved.plan,saved.plan.tasks[0].title,code).includes(label));
    const defaultPlan=createPlan({},[],'2026-10-20');
    assert.ok(translatePlanText(defaultPlan,defaultPlan.tasks[0].title,code).includes(t(defaultPlan.subject)));
    const typedPlan=createPlan({subject:'بیرکاری'},[],'2026-10-20');
    assert.ok(translatePlanText(typedPlan,typedPlan.tasks[0].title,code).includes('بیرکاری'));
    const edited=sanitizePlatform({profile:{...profile,subject:'My typed subject'}}).profile;
    assert.equal(edited.sourceUI.subject,undefined);
    assert.equal(localizedField(edited,'subject',t),'My typed subject');
  }
});

test('Kurmanji dates remain in Latin script even without a browser Intl locale',()=>{
  assert.doesNotMatch(displayDate('2026-10-20',{weekday:'long'},'kmr'),/[\u0620-\u06ff]/);
});
