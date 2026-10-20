import { cleanSourceUI } from './authoredText.js';
import {questions,sections} from '../data/questions.js';
import {isStepComplete} from './validation.js';
import {createLearningState,sanitizeLearning} from './learning.js';
const allowedLocales=['ckb','kmr','ar','en','fa'];

export const ASSESSMENT_KEY='sorani-study-assessment:v1';
export const PLATFORM_KEY='hawre-study-platform:v2';
export const emptyAssessment=()=>({step:0,answers:{},extraTexts:{},studentName:''});
export const emptyPlatform=()=>({profile:{grade:'',subject:'',dailyMinutes:30,environment:'shared',works:false,goal:'',sourceUI:{}},plan:null,checkins:[],sessions:[],attempts:[],tools:{flashcards:[],mistakes:[],timetable:[]},preferences:{largeText:false,dark:false,language:'ckb'},learning:createLearningState(),feedback:[]});
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=5000)=>typeof v==='string'?v.slice(0,max):'';
const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
const int=(v,min,max,fallback)=>Math.round(num(v,min,max,fallback));
const list=(v,max=1000)=>Array.isArray(v)?v.filter(record).slice(-max):[];
const id=v=>text(v,100).trim();
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return '';const[y,m,d]=v.split('-').map(Number),c=new Date(0);c.setUTCFullYear(y,m-1,d);return y>0&&c.getUTCFullYear()===y&&c.getUTCMonth()===m-1&&c.getUTCDate()===d?v:'';}
const timestamp=v=>typeof v==='string'&&v.length<60&&Number.isFinite(Date.parse(v))?v:'';
const unique=items=>[...new Map(items.filter(x=>x.id).map(x=>[x.id,x])).values()];
const reasons=['understanding','starting','time','environment','tired'];
export function sanitizeAssessment(saved){const s=emptyAssessment();if(!record(saved))return s;for(const q of questions){const v=saved.answers?.[q.id];if(typeof v==='string'&&(!q.options||q.options.includes(v)))s.answers[q.id]=text(v,10000);if(q.type==='radio-text'&&typeof saved.extraTexts?.[q.id+'_extra']==='string')s.extraTexts[q.id+'_extra']=text(saved.extraTexts[q.id+'_extra']);}s.studentName=text(saved.studentName,100);const requested=Number.isInteger(saved.step)?Math.max(0,Math.min(sections.length,saved.step)):0;while(s.step<requested&&isStepComplete(s.step,s.answers,s.extraTexts))s.step++;return s;}
function tasks(items,max){return unique(list(items,max).map(t=>({id:id(t.id),date:date(t.date),title:text(t.title,600),minutes:int(t.minutes,1,180,10),done:t.done===true,why:text(t.why,1000),category:int(t.category,0,3,0),dayIndex:int(t.dayIndex,0,6,0),completedDate:t.done?date(t.completedDate)||date(t.date):null,...(t.adjusted?{adjusted:true}:{})})).filter(t=>t.date&&t.title.trim()));}
export function sanitizePlatform(saved){
  const s=emptyPlatform();if(!record(saved))return s;const p=record(saved.profile)?saved.profile:{};
  s.profile={grade:text(p.grade,80),subject:text(p.subject,100),dailyMinutes:int(p.dailyMinutes,10,180,30),environment:['quiet','shared','noisy'].includes(p.environment)?p.environment:'shared',works:p.works===true,goal:text(p.goal,500)};
  s.profile.sourceUI=cleanSourceUI({...s.profile,sourceUI:p.sourceUI});
  s.preferences={largeText:saved.preferences?.largeText===true,dark:saved.preferences?.dark===true,language:allowedLocales.includes(saved.preferences?.language)?saved.preferences.language:'ckb'};
  s.sessions=unique(list(saved.sessions).map(x=>({id:id(x.id),date:date(x.date),minutes:int(x.minutes,1,180,25),subject:text(x.subject,160)})).filter(x=>x.date));
  s.checkins=[...new Map(unique(list(saved.checkins,365).map(c=>({id:id(c.id),date:date(c.date),mood:c.mood,note:text(c.note),completedCount:int(c.completedCount,0,1000,0),supportReason:reasons.includes(c.supportReason)?c.supportReason:'',supportAction:text(c.supportAction,1000)})).filter(c=>c.date&&['easy','okay','hard'].includes(c.mood))).map(c=>[c.date,c])).values()];
  s.attempts=unique(list(saved.attempts,100).filter(a=>Array.isArray(a.scores)&&a.scores.length===4&&a.scores.every(v=>Number.isFinite(v)&&v>=0&&v<=100)).map(a=>({id:id(a.id),date:date(a.date),scores:[...a.scores],scoringVersion:a.scoringVersion==='support-v2'?'support-v2':'legacy-v1'})).filter(a=>a.date));
  if(record(saved.plan)&&date(saved.plan.startDate)){const p=saved.plan,active=tasks(p.tasks,21),ids=new Set(active.map(t=>t.id));s.plan={version:1,startDate:date(p.startDate),dailyMinutes:int(p.dailyMinutes,10,180,s.profile.dailyMinutes),subject:text(p.subject,100),goal:text(p.goal,500),priorityIndex:int(p.priorityIndex,0,3,0),reason:text(p.reason,1000),tasks:active,historyTasks:tasks(p.historyTasks,300).filter(t=>t.done&&!ids.has(t.id)),adjustedDates:Array.isArray(p.adjustedDates)?[...new Set(p.adjustedDates.map(date).filter(Boolean))].slice(-60):[]};}
  if(s.plan)s.plan.sourceUI=cleanSourceUI({...s.plan,sourceUI:saved.plan.sourceUI},true);
  const t=record(saved.tools)?saved.tools:{};
  s.tools.flashcards=unique(list(t.flashcards,500).map(c=>({id:id(c.id),question:text(c.question,3000),answer:text(c.answer),subject:text(c.subject,120),status:c.status==='known'||c.known===true?'known':'review',createdAt:timestamp(c.createdAt),dueDate:date(c.dueDate),intervalDays:int(c.intervalDays,0,30,0),attempts:int(c.attempts,0,100000,0),lastReviewed:date(c.lastReviewed)})).filter(c=>c.question.trim()&&c.answer.trim()));
  s.tools.mistakes=unique(list(t.mistakes,500).map(m=>({id:id(m.id),subject:text(m.subject,120),question:text(m.question),correction:text(m.correction),resolved:m.resolved===true,createdAt:timestamp(m.createdAt),nextReviewDate:date(m.nextReviewDate),reattempts:int(m.reattempts,0,100000,0),lastReattempt:date(m.lastReattempt),reattemptExplanation:text(m.reattemptExplanation)})).filter(m=>m.question.trim()&&m.correction.trim()));
  const days=['saturday','sunday','monday','tuesday','wednesday','thursday','friday'];
  s.tools.timetable=unique(list(t.timetable,100).map(x=>({id:id(x.id),day:days.includes(x.day)?x.day:'',subject:text(x.subject,200),time:typeof x.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.time)?x.time:''})).filter(x=>x.day&&x.subject.trim()&&x.time));
  s.learning=sanitizeLearning(saved.learning);
  s.feedback=unique(list(saved.feedback,200).map(f=>({id:id(f.id),date:date(f.date),useful:int(f.useful,1,5,3),reason:text(f.reason,120),note:text(f.note,2000)})).filter(f=>f.date));
  return s;
}
function read(key,clean){try{return clean(JSON.parse(localStorage.getItem(key)));}catch{return clean(null);}}
export const readProgress=()=>read(ASSESSMENT_KEY,sanitizeAssessment);
export const readPlatform=()=>read(PLATFORM_KEY,sanitizePlatform);
function save(key,state,empty){try{if(JSON.stringify(state)===JSON.stringify(empty()))localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}}
export const persistProgress=s=>save(ASSESSMENT_KEY,s,emptyAssessment);
export const persistPlatform=s=>save(PLATFORM_KEY,s,emptyPlatform);
export function clearProgress(){try{localStorage.removeItem(ASSESSMENT_KEY);}catch{}}
export function clearAll(){clearProgress();try{localStorage.removeItem(PLATFORM_KEY);}catch{}}
export function readBackup(data){if(!record(data)||data.application!=='hawre-study'||![2,3].includes(data.version)||!record(data.assessment)||!record(data.assessment.answers)||!record(data.assessment.extraTexts)||!Number.isInteger(data.assessment.step)||data.assessment.step<0||data.assessment.step>4||typeof data.assessment.studentName!=='string'||!record(data.platform)||!record(data.platform.profile)||!record(data.platform.tools)||!record(data.platform.preferences)||!['sessions','checkins','attempts'].every(k=>Array.isArray(data.platform[k]))||!['flashcards','mistakes','timetable'].every(k=>Array.isArray(data.platform.tools[k]))||!(data.platform.plan===null||(record(data.platform.plan)&&date(data.platform.plan.startDate)&&Array.isArray(data.platform.plan.tasks))))throw Error('Invalid backup');return{assessment:sanitizeAssessment(data.assessment),platform:sanitizePlatform(data.platform)};}
