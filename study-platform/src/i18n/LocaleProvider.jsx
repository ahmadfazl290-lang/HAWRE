import React,{createContext,useContext,useEffect,useLayoutEffect,useMemo,useState,useId} from 'react';
import {LANGUAGE_KEY,LANGUAGES,isLocale,languageInfo,translate} from './runtime.js';
const Context=createContext(null);
function initialLocale(){try{const chosen=localStorage.getItem(LANGUAGE_KEY);if(isLocale(chosen))return chosen;const saved=JSON.parse(localStorage.getItem('hawre-study-platform:v2'))?.preferences?.language;return isLocale(saved)?saved:'ckb';}catch{return 'ckb';}}
export function LocaleProvider({children}){
 const[locale,setChosen]=useState(initialLocale);
 const info=languageInfo(locale);
 const setLocale=next=>{if(isLocale(next))setChosen(next);};
 useLayoutEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=info.direction;document.title=`${translate('هاوڕێ',locale)} | ${translate('فێربوون',locale)}`;},[locale,info.direction]);
 useEffect(()=>{try{localStorage.setItem(LANGUAGE_KEY,locale);}catch{}},[locale]);
 const value=useMemo(()=>({locale,direction:info.direction,setLocale,t:(source,values)=>translate(source,locale,values)}),[locale,info.direction]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n(){const value=useContext(Context);if(!value)throw Error('LocaleProvider is required');return value;}
export function Message({source,values={}}){const{t}=useI18n(),translated=t(source);return <>{String(translated).split(/(\{p\d+\})/g).map((part,index)=>{const match=/^\{(p\d+)\}$/.exec(part);return <React.Fragment key={index}>{match&&Object.hasOwn(values,match[1])?values[match[1]]:part}</React.Fragment>;})}</>;}
export function LanguageSelector(){const{locale,setLocale}=useI18n(),id=useId();const labels={ckb:'زمان',kmr:'Ziman',ar:'اللغة',en:'Language',fa:'زبان'};return <label className="language-selector" htmlFor={id}><span>{labels[locale]}</span><select id={id} data-testid="language-selector" value={locale} onChange={e=>setLocale(e.target.value)}>{LANGUAGES.map(l=><option key={l.code} value={l.code} lang={l.code} dir={l.direction}>{l.label}</option>)}</select></label>;}
