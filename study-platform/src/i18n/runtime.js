import en from './en.json' with {type:'json'};
import kmr from './kmr.json' with {type:'json'};
import ar from './ar.json' with {type:'json'};
import fa from './fa.json' with {type:'json'};
import patterns from './patterns.json' with {type:'json'};
import { localizedField } from '../utils/authoredText.js';

export const LANGUAGE_KEY='hawre:language';
export const LANGUAGES=[
 {code:'ckb',label:'کوردی سۆرانی',direction:'rtl',intl:'ckb-IQ'},
 {code:'kmr',label:'Kurdî Kurmancî',direction:'ltr',intl:'ku-Latn'},
 {code:'ar',label:'العربية',direction:'rtl',intl:'ar-IQ'},
 {code:'en',label:'English',direction:'ltr',intl:'en-GB'},
 {code:'fa',label:'فارسی',direction:'rtl',intl:'fa-IR'}
];
export const isLocale=value=>LANGUAGES.some(l=>l.code===value);
export const languageInfo=locale=>LANGUAGES.find(l=>l.code===locale)||LANGUAGES[0];
const dictionaries={en,kmr,ar,fa};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const knownPatterns=new Set(patterns.map(p=>p.key));
const allPatterns=[...patterns,...Object.keys(en).filter(key=>/\{p\d+\}/.test(key)&&!knownPatterns.has(key)).map(key=>({key,rawParams:[]}))];
const compiled=allPatterns.map(p=>{
 const slots=[...p.key.matchAll(/\{p(\d+)\}/g)].map(m=>Number(m[1]));
 const chunks=p.key.split(/\{p\d+\}/).map(escape);
 return {...p,slots,regex:new RegExp('^'+chunks.join('([\\s\\S]*?)')+'$'),weight:chunks.join('').length};
}).sort((a,b)=>b.weight-a.weight);
function digits(value,locale){const western=String(value).replace(/[٠-٩۰-۹]/g,c=>'٠١٢٣٤٥٦٧٨٩'.includes(c)?String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)):String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));return locale==='ar'?western.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):locale==='fa'?western.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]):western;}
function interpolate(template,values){return template.replace(/\{(p\d+)\}/g,(key,name)=>Object.hasOwn(values||{},name)?String(values[name]??''):key);}
export function translate(source,locale='ckb',values,depth=0,rawValues){
 if(typeof source!=='string')return source;
 const dict=dictionaries[locale];
 if(!dict)return values?interpolate(source,values):source;
 const exact=dict[source]??dict[source.trim()];
 if(typeof exact==='string')return values?interpolate(exact,values):exact;
 if(!/[\u0620-\u064a\u066e-\u06d3\u06fa-\u06ff]/.test(source))return /^[\d٠-٩۰-۹\s/,:.\-–]+$/.test(source)?digits(source,locale):source;
 if(depth<4){for(const p of compiled){const match=p.regex.exec(source);if(!match||!dict[p.key])continue;const variables={};p.slots.forEach((slot,i)=>{const raw=match[i+1];variables['p'+slot]=p.rawParams.includes(slot)?(Object.hasOwn(rawValues||{},raw)?rawValues[raw]:raw):translate(raw,locale,undefined,depth+1,rawValues);});return interpolate(dict[p.key],variables);}}
 return source;
}
export function translateAnswer(question,value,locale){return question?.options?.includes(value)?translate(value,locale):value;}
export function translatePlanText(plan,source,locale){
 const subject=localizedField(plan,'subject',value=>translate(value,locale));
 return translate(source,locale,undefined,0,{[plan?.subject]:subject});
}
export function formatDateTime(value,locale='ckb'){
 const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
 const info=languageInfo(locale);
 if(Intl.DateTimeFormat.supportedLocalesOf([info.intl]).length)return new Intl.DateTimeFormat(info.intl,{dateStyle:'medium',timeStyle:'short'}).format(d);
 const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
