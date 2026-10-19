import { useEffect, useMemo, useRef, useState } from 'react';
import { sections, questions } from './data/questions.js';
import { calculateScores } from './utils/scoring.js';
import { isStepComplete, isQuestionComplete } from './utils/validation.js';
import { readProgress, readPlatform, persistProgress, persistPlatform, emptyAssessment, emptyPlatform, clearProgress, clearAll, readBackup } from './utils/storage.js';
import { localDate } from './utils/planning.js';
import QuestionsForm from './components/QuestionsForm.jsx';
import ReportCard from './components/ReportCard.jsx';
import PersonalPlan from './components/PersonalPlan.jsx';
import ProgressDashboard from './components/ProgressDashboard.jsx';
import StudyTools from './components/StudyTools.jsx';
import Settings from './components/Settings.jsx';
import './print.css';

const tabs = [['home','⌂','سەرەتا'],['assessment','◎','خۆناسین'],['plan','▦','پلانی من'],['tools','◷','ئامرازەکان'],['progress','↗','پێشکەوتن'],['settings','⚙','ڕێکخستن']];
const uniqueId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function downloadFile(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [assessment, setAssessment] = useState(readProgress);
  const [data, setData] = useState(readPlatform);
  const [tab, setTab] = useState('home');
  const [notice, setNotice] = useState('');
  const [storageOkay, setStorageOkay] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareName, setShareName] = useState(false);
  const [shareAnswers, setShareAnswers] = useState(false);
  const mainRef = useRef(null), importRef = useRef(null);
  const { step, answers, extraTexts, studentName } = assessment;
  const { profile, plan, checkins, sessions, attempts, tools, preferences } = data;
  const setField = (key, next) => setData(prev => ({ ...prev, [key]: typeof next === 'function' ? next(prev[key]) : next }));
  const setAssessmentField = (key, next) => setAssessment(prev => ({ ...prev, [key]: typeof next === 'function' ? next(prev[key]) : next }));
  const setPlan = next => setField('plan',next), setCheckins = next => setField('checkins',next), setSessions = next => setField('sessions',next), setTools = next => setField('tools',next), setProfile = next => setField('profile',next), setPreferences = next => setField('preferences',next);
  const scores = useMemo(() => calculateScores(answers,extraTexts),[answers,extraTexts]);
  const latestScores = attempts.at(-1)?.scores || scores;
  const mainProblemIndex = scores.indexOf(Math.max(...scores));
  const chartData = sections.map((s,i) => ({ subject: s.title, short: s.title.split(' ')[0], score: scores[i], fullMark: 100 }));
  const currentSection = sections[step] || sections[0], currentQuestions = questions.filter(q => q.section === step);
  const canProceed = isStepComplete(step,answers,extraTexts);
  const remaining = currentQuestions.filter(q => !isQuestionComplete(q,answers,extraTexts)).length;
  const today = localDate(), todaysTasks = plan?.tasks.filter(t => t.date === today) || [];
  const completed = [...(plan?.tasks || []),...(plan?.historyTasks || [])].filter(t => t.done).length;

  useEffect(() => { const a = persistProgress(assessment), b = persistPlatform(data); setStorageOkay(a && b); },[assessment,data]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online',update); window.addEventListener('offline',update); return () => { window.removeEventListener('online',update); window.removeEventListener('offline',update); }; },[]);
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); },[tab,step]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''),6000); return () => clearTimeout(timer); } },[notice]);
  const handleAnswer = (qId,value) => setAssessmentField('answers',prev => ({ ...prev,[qId]: value }));
  const handleNext = () => {
    if (!canProceed) return;
    if (step === 3) {
      if (![0,1,2,3].every(s => isStepComplete(s,answers,extraTexts))) return;
      setData(prev => ({ ...prev,attempts: [...prev.attempts,{ id: uniqueId(), date: localDate(), scores }].slice(-100) }));
    }
    setAssessmentField('step',Math.min(4,step+1));
  };
  const handleReset = () => { clearProgress(); setAssessment(emptyAssessment()); setShareOpen(false); setTab('assessment'); setNotice('فۆڕمێکی نوێ کرایەوە؛ پلان و پێشکەوتنەکانت پارێزراون.'); };
  const reportText = (withName = true,withAnswers = true) => {
    let content = 'ڕاپۆرتی دیاریکردنی کێشەکانی خوێندن\n';
    if (withName) content += `ناو: ${studentName || 'بەبێ ناو (نهێنی)'}\n`;
    content += `بەروار: ${localDate()}\nنیشاندەری وەڵامە کەسییەکان؛ دەستنیشانکردنی پزیشکی نییە.\n\n`;
    sections.forEach((s,i) => { content += `${s.icon} ${s.title}: ${scores[i]}%\n`; });
    content += `\nکێشەی سەرەکی: ${sections[mainProblemIndex].title}\n`;
    if (withAnswers) questions.forEach(q => { content += `\n[${sections[q.section].title}] ${q.text}\nوەڵام: ${answers[q.id] || '(وەڵام نەدراوە)'}\n`; if (extraTexts[q.id+'_extra']) content += `تێبینی: ${extraTexts[q.id+'_extra']}\n`; });
    return content;
  };
  const handleShare = async () => {
    const text = reportText(shareName,shareAnswers);
    if (navigator.share) { try { await navigator.share({ title: 'دیاریکردنی کێشەکانی خوێندن',text }); setShareOpen(false); } catch (error) { if (error.name !== 'AbortError') setNotice('هاوبەشکردن سەرکەوتوو نەبوو؛ دەتوانیت دەقەکە دابگریت.'); } }
    else { try { await navigator.clipboard.writeText(text); setNotice('دەقەکە کۆپی کرا! 📋'); } catch { downloadFile('hawre-share.txt',text); setNotice('دەقەکە وەک فایل ئامادە کرا.'); } }
  };
  const exportBackup = () => downloadFile(`hawre-backup-${today}.json`,JSON.stringify({ application: 'hawre-study',version: 2,assessment,platform: data },null,2),'application/json');
  const importBackup = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.size > 50*1024*1024) { setNotice('قەبارەی فایلەکە دەبێت کەمتر لە ٥٠ مێگابایت بێت.'); return; }
    try { const imported = readBackup(JSON.parse(await file.text())); if (!window.confirm('زانیارییەکانی ئەم ئامێرە بە ناوەڕۆکی فایلەکە بگۆڕدرێن؟')) return; setAssessment(imported.assessment); setData(imported.platform); setShareOpen(false); setNotice('زانیارییەکان گەڕێندرانەوە.'); } catch { setNotice('ئەم فایلە پاشەکەوتێکی دروستی هاوڕێ نییە.'); }
  };
  const deleteEverything = () => { if (!window.confirm('هەموو وەڵام، پلان، کارت و پێشکەوتنەکانی هاوڕێ لەم وێبگەڕە بسڕدرێنەوە؟')) return; clearAll(); setAssessment(emptyAssessment()); setData(emptyPlatform()); setShareOpen(false); setTab('home'); setNotice('هەموو زانیارییەکانی هاوڕێ سڕانەوە.'); };

  return <div dir="rtl" className={`app-shell ${preferences.dark ? 'dark' : ''} ${preferences.largeText ? 'large-text' : ''}`}>
    <a className="skip-link" href="#main">بازدان بۆ ناوەڕۆک</a>
    <aside className="sidebar print:hidden"><a className="brand" href="#main" onClick={() => setTab('home')}><img src="/icon.svg" width="44" height="44" alt=""/><span><strong>هاوڕێ</strong><small>هەنگاو بە هەنگاو، لەگەڵ تۆ</small></span></a><p className="nav-label">شوێنی خوێندنی تۆ</p><nav aria-label="بەشە سەرەکییەکان">{tabs.map(([key,icon,label]) => <button key={key} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`nav-item ${tab === key ? 'active' : ''}`}><span aria-hidden="true">{icon}</span>{label}{key === 'plan' && todaysTasks.some(t => !t.done) && <i aria-label="ئەرکی ئەمڕۆ هەیە"/>}</button>)}</nav><div className="sidebar-note"><span>✦</span><p>هەنگاوێکی بچووکیش<br/>پێشکەوتنە.</p><small>بە خێرایی خۆت بەردەوام بە.</small></div><p className="local-label"><span className="status-dot"/>{online ? 'زانیارییەکان لەم ئامێرە دەمێننەوە' : 'ئێستا بەبێ ئینتەرنێتیت'}</p></aside>
    <div className="workspace"><header className="topbar print:hidden"><p>پلاتفۆرمی پشتگیری خوێندن <span>/ {tabs.find(t => t[0] === tab)?.[2]}</span></p><div className="topbar-actions"><span className="badge">بەبێ هەژمار</span><button className="icon-btn" aria-label={preferences.dark ? 'دۆخی ڕووناک' : 'دۆخی تاریک'} onClick={() => setPreferences(p => ({ ...p,dark: !p.dark }))}>{preferences.dark ? '☀' : '☾'}</button></div></header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {!storageOkay && <p className="alert print:hidden" role="alert">وێبگەڕەکە ناتوانێت پێشکەوتنت پاشەکەوت بکات. لە ڕێکخستنەکان فایلێکی پاشەکەوت دابگرە.</p>}{notice && <p role="status" className="toast print:hidden">{notice}</p>}
        {tab === 'home' && <>
          <section className="hero"><div><span className="eyebrow">شوێنێک بۆ گەشەکردنی تۆ</span><h1>خوێندنی باشتر،<br/><em>هەنگاو بە هەنگاو.</em></h1><p>خۆت بناسە، پلانێکی گونجاو دابنێ و بە خێرایی خۆت پێش بکەوە. هاوڕێ لەگەڵتە.</p><div className="hero-actions"><button className="btn btn-primary" onClick={() => setTab('assessment')}>{step === 4 ? 'بینینی ڕاپۆرتەکەم' : Object.keys(answers).length ? 'بەردەوامبوون لە فۆڕم' : 'با لە خۆناسینەوە دەست پێ بکەین'} ←</button><button className="btn btn-secondary" onClick={() => setTab('plan')}>پلانی هەفتەکەم</button></div></div><div className="hero-art" aria-hidden="true"><span className="art-orbit"/><div className="art-card"><span>✦</span><b>هەنگاوی ئەمڕۆ</b><i/><i/><i/><div>✓　✓　○</div></div><div className="art-seal">بەردەوام بە<br/><strong>دەتوانیت</strong></div><span className="art-star">✳</span></div></section>
          <section className="stats-grid" aria-label="پوختەی پێشکەوتن"><Metric value={completed} label="ئەرکی تەواوکراو" icon="✓"/><Metric value={sessions.reduce((s,x) => s+x.minutes,0)} label="خولەکی تۆمارکراوی خوێندن" icon="◷"/><Metric value={new Set(sessions.map(s => s.date)).size} label="ڕۆژی خوێندنی تۆمارکراو" icon="☀"/></section>
          <div className="grid-two dashboard-grid"><section className="panel"><div className="section-heading"><div><span className="eyebrow">هەنگاوی داهاتوو</span><h2>ئەمڕۆ چی بکەم؟</h2></div><span className="badge">{today}</span></div>{todaysTasks.length ? <div className="stack">{todaysTasks.map(task => <label className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}><input type="checkbox" checked={task.done} onChange={() => setPlan(p => ({ ...p,tasks: p.tasks.map(t => t.id === task.id ? { ...t,done: !t.done, completedDate: !t.done ? today : undefined } : t) }))}/><span>{task.title}<small>{task.minutes} خولەک</small></span></label>)}</div> : <div className="empty-state"><span>🌱</span><h3>لە هەنگاوێکی بچووکەوە دەست پێ بکە</h3><p>کات و وانەی خۆت دیاری بکە؛ پلانێکی گونجاو بۆ هەفتەکەت دروست بکە.</p><button className="btn btn-primary" onClick={() => setTab('plan')}>دروستکردنی پلان</button></div>}</section><section className="panel warm-panel"><span className="eyebrow">ئەمڕۆ تاقی بکەرەوە</span><h2>کتێبەکە دابخە،<br/>ئەوەی فێر بوویت بڵێوە.</h2><p>دوای خوێندنی بابەتێکی بچووک، بەبێ سەیرکردنی کتێب بە وشەی خۆت ڕوونی بکەرەوە. پاشان بگەڕێوە و ئەو بەشانە ببینە کە لەبیرت چوون.</p><button className="text-link" onClick={() => setTab('tools')}>کارتی پرسیار و وەڵام دروست بکە ←</button></section></div>
          <section className="panel"><div className="section-heading"><h2>ڕێگاکە چۆنە؟</h2><span className="muted">هەر کات دەتوانیت پلانت بگۆڕیت</span></div><div className="journey-grid">{[['01','خۆت بناسە','١٦ پرسیار بۆ تێگەیشتن لە عادەتەکانت.','assessment'],['02','پلانت دابنێ','ئەرکی بچووک بەپێی کات و ژینگەکەت.','plan'],['03','تاقی بکەرەوە','ئامرازەکان بەکاربهێنە و ئەنجامەکانت ببینە.','tools']].map(([n,title,desc,key]) => <button className="journey-card" key={n} onClick={() => setTab(key)}><span>{n}</span><h3>{title}</h3><p>{desc}</p></button>)}</div></section>
        </>}
        {tab === 'assessment' && <><PageTitle eyebrow="خۆناسین، بەبێ حوکمدان" title={step === 4 ? 'ڕاپۆرتی من' : 'دیاریکردنی کێشەکانی خوێندن'} subtitle="ئەم فۆڕمە بۆ یارمەتیدانی تۆیە، بۆ سزادان نییە - بە ئارامی و ڕاستگۆیانە وەڵام بدەرەوە"/>{step < 4 ? <div className="assessment-container"><nav className="steps print:hidden" aria-label="بەشەکانی فۆڕم">{sections.map((s,i) => <button disabled={i > step} key={s.id} aria-current={i === step ? 'step' : undefined} onClick={() => setAssessmentField('step',i)}><span>{i < step ? '✓' : s.icon}</span><small>{s.title}</small></button>)}</nav><p className="validation-note" role="status">{remaining ? `${remaining} پرسیاری ئەم بەشە ماوە؛ هەموویان وەڵام بدەرەوە تا دواتر چالاک بێت.` : 'هەموو پرسیارەکانی ئەم بەشەت وەڵام داوەتەوە ✓'}</p><QuestionsForm {...{ currentSection,currentQuestions,answers,extraTexts,handleAnswer,step,canProceed,handleNext }} setExtraTexts={next => setAssessmentField('extraTexts',next)} handlePrev={() => setAssessmentField('step',Math.max(0,step-1))}/><p className="muted assessment-footnote">هەموو پرسیارەکان پێویستن. ئەگەر هیچ ڕێگرییەکت نییە، لە خانەی نووسین بنووسە «نییە». لە پرسیاری بیرچوونەوەدا، بۆ دوو هەڵبژاردەی یەکەم ناوی وانەکەش بنووسە.</p></div> : <ReportCard {...{ studentName,chartData,scores,mainProblemIndex,answers,extraTexts,handleReset }} setStudentName={next => setAssessmentField('studentName',next)} handleDownloadText={() => downloadFile(`rapwrt-${Date.now()}.txt`,reportText())} handleShare={() => { setShareName(false); setShareAnswers(false); setShareOpen(true); }} onOpenPlan={() => setTab('plan')} onEdit={() => setAssessmentField('step',0)}/>}</>}
        {tab === 'plan' && <><PageTitle eyebrow="ڕێگایەکی گونجاو بۆ تۆ" title="پلانی من" subtitle="کات، وانە و ژینگەکەت دیاری بکە. پلانەکە دەتوانێت لەگەڵ تۆ بگۆڕێت."/><ProfileEditor {...{ profile,setProfile }}/>{!attempts.length && <p className="info-note">دەتوانیت ئێستا پلانێکی گشتی دروست بکەیت؛ دوای تەواوکردنی فۆڕم پێشنیارەکان بە وەڵامەکانت دەگونجێن.</p>}<PersonalPlan {...{ profile,plan,setPlan,checkins,setCheckins,sessions }} scores={latestScores} onOpenTools={() => setTab('tools')}/></>}
        {tab === 'tools' && <><PageTitle eyebrow="کەمێک ڕێکخراوتر، کەمێک ئاسانتر" title="ئامرازەکانی خوێندن" subtitle="ئامرازێک هەڵبژێرە و دەست پێ بکە. زانیارییەکانت لەم وێبگەڕەدا دەپارێزرێن."/><StudyTools {...{ profile,sessions,setSessions,tools,setTools }}/></>}
        {tab === 'progress' && <><PageTitle eyebrow="هەوڵەکانت ببینە" title="پێشکەوتنی من" subtitle="هەر هەنگاوێک هەژمار دەکرێت؛ ڕۆژێکی پشوو پێشکەوتنەکانت ناسڕێتەوە."/><ProgressDashboard {...{ plan,checkins,sessions,attempts }} onReassess={handleReset}/></>}
        {tab === 'settings' && <><PageTitle eyebrow="بە پێی پێویستی تۆ" title="ڕێکخستن و نهێنی" subtitle="کۆنترۆڵی زانیاری و شێوەی بەکارهێنان لە دەستی خۆتە."/><Settings {...{ preferences,setPreferences,exportBackup,deleteEverything }} onImport={() => importRef.current?.click()}/></>}
        <input ref={importRef} type="file" accept=".json,application/json" onChange={importBackup} hidden aria-label="گەڕاندنەوەی پاشەکەوت"/><footer className="footer print:hidden"><span>هاوڕێ؛ بۆ هەنگاوە بچووکە گرنگەکانت.</span><button onClick={() => setTab('settings')}>نهێنی و زانیارییەکانت</button></footer>
      </main></div>
    {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} {...{ shareName,setShareName,shareAnswers,setShareAnswers,handleShare }} preview={reportText(shareName,shareAnswers)} onDownload={() => downloadFile('hawre-share.txt',reportText(shareName,shareAnswers))}/>}
  </div>;
}
function PageTitle({ eyebrow,title,subtitle }) { return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>; }
function Metric({ value,label,icon }) { return <div className="metric"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
function ProfileEditor({ profile,setProfile }) {
  const update = (key,value) => setProfile(p => ({ ...p,[key]: value }));
  return <section className="panel"><div className="section-heading"><h2>بارودۆخی خوێندنت</h2><span className="badge">هەر کات بگۆڕە</span></div><div className="form-grid"><label>پۆل / قۆناغ<input className="input" value={profile.grade} maxLength={80} onChange={e => update('grade',e.target.value)} placeholder="بۆ نموونە: پۆلی ١٢"/></label><label>وانەی سەرەکی<input className="input" value={profile.subject} maxLength={100} onChange={e => update('subject',e.target.value)} placeholder="بۆ نموونە: بیرکاری"/></label><label>کاتی بەردەست لە ڕۆژێکدا<select className="input" value={profile.dailyMinutes} onChange={e => update('dailyMinutes',Number(e.target.value))}>{[10,15,20,30,45,60,90,120,180].map(n => <option key={n} value={n}>{n} خولەک</option>)}</select></label><label>ژینگەی خوێندن<select className="input" value={profile.environment} onChange={e => update('environment',e.target.value)}><option value="quiet">شوێنی هێمنم هەیە</option><option value="shared">شوێنەکە هاوبەشە</option><option value="noisy">شوێنەکە ژاوەژاوە</option></select></label><label className="full-width">ئامانجێکی بچووک بۆ ئەم هەفتەیە<input className="input" value={profile.goal} maxLength={500} onChange={e => update('goal',e.target.value)} placeholder="بۆ نموونە: لە یەک بابەتی بیرکاری تێبگەم"/></label><label className="check-label full-width"><input type="checkbox" checked={profile.works} onChange={e => update('works',e.target.checked)}/>لەگەڵ خوێندن کار دەکەم یان بەرپرسیارێتی خێزانیم هەیە</label></div></section>;
}
function ShareDialog({ onClose,shareName,setShareName,shareAnswers,setShareAnswers,handleShare,preview,onDownload }) {
  const ref = useRef(null);
  useEffect(() => { const previous = document.activeElement; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; },[]);
  return <dialog ref={ref} className="share-dialog" aria-labelledby="share-title" onCancel={onClose}><div className="section-heading"><h2 id="share-title">چی هاوبەش دەکەیت؟</h2><button className="icon-btn" aria-label="داخستن" onClick={onClose}>×</button></div><p className="muted">تەنها ئەو زانیارییانە هەڵبژێرە کە دەتەوێت کەسێکی تر بیبینێت.</p><label className="check-label"><input type="checkbox" checked={shareName} onChange={e => setShareName(e.target.checked)}/>ناوی قوتابی زیاد بکە</label><label className="check-label"><input type="checkbox" checked={shareAnswers} onChange={e => setShareAnswers(e.target.checked)}/>وەڵام و تێبینییە کەسییەکان زیاد بکە</label><pre className="share-preview">{preview}</pre><div className="action-row"><button className="btn btn-primary" onClick={handleShare}>هاوبەشکردن / کۆپی</button><button className="btn btn-secondary" onClick={onDownload}>داگرتنی دەقی هەڵبژێردراو</button></div></dialog>;
}
