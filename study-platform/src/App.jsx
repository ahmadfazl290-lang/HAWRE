import { translateAnswer, translatePlanText } from "./i18n/runtime.js";
import { localizedField } from './utils/authoredText.js';
import { useI18n, Message, LanguageSelector } from "./i18n/LocaleProvider.jsx";
import { useEffect, useMemo, useRef, useState } from 'react';
import { sections, questions } from './data/questions.js';
import { learningTopicById } from './data/learningTopics.js';
import { calculateScores, SCORING_VERSION } from './utils/scoring.js';
import { isStepComplete, isQuestionComplete } from './utils/validation.js';
import { readProgress, readPlatform, persistProgress, persistPlatform, emptyAssessment, emptyPlatform, clearProgress, clearAll, readBackup } from './utils/storage.js';
import { localDate } from './utils/planning.js';
import { summarizeLearning } from './utils/learning.js';
import QuestionsForm from './components/QuestionsForm.jsx';
import ReportCard from './components/ReportCard.jsx';
import PersonalPlan from './components/PersonalPlan.jsx';
import ProgressDashboard from './components/ProgressDashboard.jsx';
import StudyTools from './components/StudyTools.jsx';
import LearningPath from './components/LearningPath.jsx';
import SupportCenter from './components/SupportCenter.jsx';
import Settings from './components/Settings.jsx';
const tabs = [['home', '⌂', 'سەرەتا'], ['assessment', '◎', 'خۆناسین'], ['learning', '✧', 'فێربوون'], ['plan', '▦', 'پلانی من'], ['tools', '◷', 'ئامرازەکان'], ['progress', '↗', 'پێشکەوتن'], ['support', '♡', 'پشتگیری'], ['settings', '⚙', 'ڕێکخستن']];
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function downloadFile(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], {
      type
    })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const {
    t,
    direction,
    locale,
    setLocale
  } = useI18n();
  const [assessment, setAssessment] = useState(readProgress),
    [data, setData] = useState(readPlatform),
    [tab, setTab] = useState('home');
  const [notice, setNotice] = useState(''),
    [storageOkay, setStorageOkay] = useState(true),
    [shareOpen, setShareOpen] = useState(false),
    [shareName, setShareName] = useState(false),
    [shareAnswers, setShareAnswers] = useState(false);
  const mainRef = useRef(null),
    importRef = useRef(null);
  const {
    step,
    answers,
    extraTexts,
    studentName
  } = assessment;
  const {
    profile,
    plan,
    checkins,
    sessions,
    attempts,
    tools,
    preferences,
    learning,
    feedback
  } = data;
  const setField = (key, next) => setData(p => ({
    ...p,
    [key]: typeof next === 'function' ? next(p[key]) : next
  }));
  const setForm = (key, next) => setAssessment(p => ({
    ...p,
    [key]: typeof next === 'function' ? next(p[key]) : next
  }));
  const setPlan = n => setField('plan', n),
    setCheckins = n => setField('checkins', n),
    setSessions = n => setField('sessions', n),
    setTools = n => setField('tools', n),
    setLearning = n => setField('learning', n),
    setPreferences = n => setField('preferences', n);
  const scores = useMemo(() => calculateScores(answers), [answers]);
  const latestScores = attempts.filter(a => a.scoringVersion === SCORING_VERSION).at(-1)?.scores || ([0, 1, 2, 3].every(s => isStepComplete(s, answers, extraTexts)) ? scores : [0, 0, 0, 0]);
  const learningSummary = useMemo(() => summarizeLearning(learning), [learning]);
  const currentSection = sections[step] || sections[0],
    currentQuestions = questions.filter(q => q.section === step),
    canProceed = isStepComplete(step, answers, extraTexts);
  const remaining = currentQuestions.filter(q => !isQuestionComplete(q, answers, extraTexts)).length;
  const today = localDate(),
    todaysTasks = plan?.tasks.filter(t => t.date === today) || [];
  const completed = [...(plan?.tasks || []), ...(plan?.historyTasks || [])].filter(t => t.done).length;
  useEffect(() => {
    const a = persistProgress(assessment),
      b = persistPlatform(data);
    setStorageOkay(a && b);
  }, [assessment, data]);
  useEffect(() => {
    mainRef.current?.focus({
      preventScroll: true
    });
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, [tab, step]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const handleAnswer = (qId, value) => setForm('answers', p => ({
    ...p,
    [qId]: value
  }));
  const handleNext = () => {
    if (!canProceed) return;
    if (step === 3) {
      if (![0, 1, 2, 3].every(s => isStepComplete(s, answers, extraTexts))) return;
      setField('attempts', p => [...p, {
        id: uid(),
        date: localDate(),
        scores,
        scoringVersion: SCORING_VERSION
      }].slice(-100));
    }
    setForm('step', Math.min(4, step + 1));
  };
  const handleReset = () => {
    clearProgress();
    setAssessment(emptyAssessment());
    setShareOpen(false);
    setTab('assessment');
    setNotice('فۆڕمێکی نوێ کرایەوە؛ فێربوون و پلان و مێژووت پارێزراون.');
  };
  function reportText(withName = true, withAnswers = true) {
    let text = t('ڕاپۆرتی دیاریکردنی کێشەکانی خوێندن\n');
    if (withName) text += t('ناو: {p0}\n', {
      p0: studentName || t('بەبێ ناو (نهێنی)')
    });
    text += t('بەروار: {p0}\nنیشاندەری پێویستی بە پشتگیری؛ نە ڕێژەی نەخۆشی.\nیاسای نمرەدان: {p1}\n\n', {
      p0: today,
      p1: SCORING_VERSION
    });
    sections.forEach((s, i) => text += t('{p0} {p1}: {p2} لە ١٠٠ نیشاندەر\n', {
      p0: s.icon,
      p1: t(s.title),
      p2: scores[i]
    }));
    if (withAnswers) questions.forEach(q => {
      text += t('\n{p0}\nوەڵام: {p1}\n', {
        p0: t(q.text),
        p1: translateAnswer(q, answers[q.id] || '—', locale)
      });
      if (extraTexts[q.id + '_extra']) text += t('تێبینی: {p0}\n', {
        p0: extraTexts[q.id + '_extra']
      });
    });
    return text;
  }
  async function share() {
    const text = reportText(shareName, shareAnswers);
    try {
      if (navigator.share) {
        await navigator.share({
          title: t('ڕاپۆرتی هاوڕێ'),
          text
        });
        setShareOpen(false);
      } else {
        await navigator.clipboard.writeText(text);
        setNotice('دەقەکە کۆپی کرا! 📋');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        downloadFile('hawre-share.txt', text);
        setNotice('دەقەکە وەک فایل ئامادە کرا.');
      }
    }
  }
  const exportBackup = () => downloadFile(`hawre-backup-${today}.json`, JSON.stringify({
    application: 'hawre-study',
    version: 3,
    assessment,
    platform: {
      ...data,
      preferences: {
        ...preferences,
        language: locale
      }
    }
  }, null, 2), 'application/json');
  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setNotice('فایلەکە دەبێت کەمتر لە ٥٠ مێگابایت بێت.');
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      const restored = readBackup(backup);
      if (!window.confirm(t('زانیارییەکانی ئێستا بە ناوەڕۆکی فایلەکە بگۆڕدرێن؟'))) return;
      setAssessment(restored.assessment);
      setData(restored.platform);
      if (backup.platform?.preferences?.language) setLocale(restored.platform.preferences.language);
      setShareOpen(false);
      setNotice('زانیارییەکان گەڕێندرانەوە.');
    } catch {
      setNotice('ئەم فایلە پاشەکەوتێکی دروستی هاوڕێ نییە.');
    }
  }
  function deleteEverything() {
    if (!window.confirm(t('هەموو وەڵام، پلان، ڕاهێنان و زانیارییەکانی هاوڕێ لەم وێبگەڕە بسڕدرێنەوە؟'))) return;
    clearAll();
    setAssessment(emptyAssessment());
    setData(emptyPlatform());
    setShareOpen(false);
    setTab('home');
    setNotice('زانیارییەکانی هاوڕێ سڕانەوە.');
  }
  const openLearning = () => setTab('learning'),
    openPlan = () => setTab('plan'),
    openSupport = () => setTab('support');
  const openPlanFromLearning = () => {
    const topic = learningTopicById[learning.activeTopic];
    if (topic) {
      setField('profile', p => ({
        ...p,
        subject: `${topic.subject} — ${topic.title}`.slice(0, 100),
        goal: topic.goal,
        sourceUI: { subject: topic.id, goal: topic.id }
      }));
      setNotice('بابەت و ئامانجی ڕاهێنان بۆ پلانت گوازرایەوە؛ دەتوانیت پلانێکی گونجاو ئامادە بکەیت.');
    }
    setTab('plan');
  };
  useEffect(() => {
    setData(previous => previous.preferences.language === locale ? previous : {
      ...previous,
      preferences: {
        ...previous.preferences,
        language: locale
      }
    });
  }, [locale]);
  return <div dir={direction} className={`app-shell ${preferences.dark ? 'dark' : ''} ${preferences.largeText ? 'large-text' : ''}`}><a className="skip-link" href="#main"><Message source="بازدان بۆ ناوەڕۆک" /></a><aside className="sidebar print:hidden"><a className="brand" href="#main" onClick={() => setTab('home')}><img src="/icon.svg" width="44" height="44" alt="" /><span><strong><Message source="هاوڕێ" /></strong><small><Message source="هەنگاو بە هەنگاو، لەگەڵ تۆ" /></small></span></a><p className="nav-label"><Message source="شوێنی خوێندنی تۆ" /></p><nav aria-label={t("بەشە سەرەکییەکان")}>{tabs.map(([key, icon, label]) => <button key={key} onClick={() => setTab(key)} className={`nav-item ${key === tab ? 'active' : ''}`} aria-current={key === tab ? 'page' : undefined}><span aria-hidden="true">{t(icon)}</span>{t(label)}</button>)}</nav><div className="sidebar-note"><span>✦</span><p><Message source="فێربوون لە هەنگاوێکی بچووکەوە دەست پێ دەکات." /></p><small><Message source="بە خێرایی خۆت، بەردەوام بە." /></small></div><p className="local-label"><Message source="● زانیارییەکان لەم ئامێرە دەمێننەوە" /></p></aside><div className="workspace"><header className="topbar print:hidden"><p><Message source="پلاتفۆرمی پشتگیری خوێندن {p0}" values={{
            p0: <span>/ {t(tabs.find(t => t[0] === tab)?.[2])}</span>
          }} /></p><div className="action-row"><LanguageSelector /><span className="badge"><Message source="بەبێ هەژمار" /></span><button className="icon-btn" aria-label={t(preferences.dark ? 'دۆخی ڕووناک' : 'دۆخی تاریک')} onClick={() => setPreferences(p => ({
            ...p,
            dark: !p.dark
          }))}>{t(preferences.dark ? '☀' : '☾')}</button></div></header><main id="main" ref={mainRef} tabIndex={-1}>
 {!storageOkay && <p className="alert print:hidden" role="alert"><Message source="پاشەکەوتکردن لە وێبگەڕ بەردەست نییە؛ لە ڕێکخستنەکان فایلێکی پاشەکەوت دابگرە." /></p>}{notice && <p className="toast print:hidden" role="status">{t(notice)}</p>}
 {tab === 'home' && <><section className="hero"><div><span className="eyebrow"><Message source="لە خۆناسینەوە بۆ فێربوون" /></span><h1><Message source="بزانە لە کوێ گیر ماویت،{p0}{p1}" values={{
                  p0: <br />,
                  p1: <em><Message source="هەنگاوی داهاتووت هەڵبژێرە." /></em>
                }} /></h1><p><Message source="عادەتەکانت بناسە، بابەتێک تاقی بکەرەوە و بە نموونە و ڕاهێنان پێش بکەوە. هەر هەنگاوێک لەگەڵ پێویستی تۆ دەگۆڕێت." /></p><div className="action-row"><button className="btn btn-primary" onClick={openLearning}><Message source="دەستپێکردنی ڕێگای فێربوون ←" /></button><button className="btn btn-secondary" onClick={() => setTab('assessment')}>{t(step === 4 ? 'بینینی ڕاپۆرتەکەم' : 'خۆناسین و عادەتەکانم')}</button></div></div><div className="hero-art" aria-hidden="true"><span>✦</span><div className="art-card"><b><Message source="هەنگاوی ئەمڕۆ" /></b><p><Message source="تاقی بکەرەوە{p0}فێر ببە{p1}دووبارە بپشکنە" values={{
                    p0: <br />,
                    p1: <br />
                  }} /></p><strong>✓　✓　○</strong></div></div></section><div className="stats-grid"><Metric value={completed} label="ئەرکی تەواوکراو" /><Metric value={sessions.reduce((s, x) => s + x.minutes, 0)} label="خولەکی تۆمارکراو" /><Metric value={attempts.length} label="هەڵسەنگاندنی عادەتەکان" /></div><div className="grid-two"><section className="panel"><div className="section-heading"><h2><Message source="ئەمڕۆ چی بکەم؟" /></h2><span className="badge">{t(today)}</span></div>{todaysTasks.length ? <div className="stack">{todaysTasks.map(task => <label className="task-row" key={task.id}><input type="checkbox" checked={task.done} onChange={() => setPlan(p => ({
                    ...p,
                    tasks: p.tasks.map(t => t.id === task.id ? {
                      ...t,
                      done: !t.done,
                      completedDate: !t.done ? today : null
                    } : t)
                  }))} /><span>{translatePlanText(plan, task.title, locale)}<small><Message source="{p0} خولەک" values={{
                        p0: t(task.minutes)
                      }} /></small></span></label>)}</div> : <div className="empty-state"><span>🌱</span><h3><Message source="پلانێکی گونجاو دابنێ" /></h3><p><Message source="وانە، کات و بارودۆخت دیاری بکە." /></p><button className="btn btn-primary" onClick={openPlan}><Message source="پلانی هەفتەکەم" /></button></div>}</section><section className="panel warm-panel"><span className="eyebrow"><Message source="هەنگاوی نوێ" /></span><h2><Message source="خوێندنت بە ڕاهێنان بپشکنە" /></h2><p><Message source="پشکنینێکی کورت، نموونەی چارەسەرکراو و پرسیاری نوێ یارمەتیت دەدەن ببینیت کام بەش پێویستی بە کارکردنی زیاتر هەیە." /></p><button className="btn btn-primary" onClick={openLearning}><Message source="هەڵبژاردنی بابەت" /></button><p className="muted"><Message source="ڕاهێنانەکان نموونەی گشتین؛ بەرنامەی تایبەتی قوتابخانە نین." /></p></section></div><section className="panel"><h2><Message source="ڕێگاکە چۆنە؟" /></h2><div className="journey-grid">{[['01', 'خۆت بناسە', 'عادەت، بارودۆخ و پێویستییەکانت.', 'assessment'], ['02', 'فێربوون تاقی بکەرەوە', 'پرسیار، نموونە و ڕاهێنان.', 'learning'], ['03', 'پێشکەوتنت ببینە', 'پلان، دووبارەکردنەوە و پشکنینی دواتر.', 'progress']].map(([n, title, desc, key]) => <button className="journey-card" key={n} onClick={() => setTab(key)}><span>{t(n)}</span><h3>{t(title)}</h3><p>{t(desc)}</p></button>)}</div></section></>}
 {tab === 'assessment' && <><PageTitle title={t(step === 4 ? 'ڕاپۆرتی من' : 'دیاریکردنی کێشەکانی خوێندن')} subtitle={t("ئەم فۆڕمە بۆ یارمەتیدانی تۆیە، بۆ سزادان نییە - بە ئارامی و ڕاستگۆیانە وەڵام بدەرەوە")} />{step < 4 ? <div className="assessment-container"><nav className="steps" aria-label={t("بەشەکانی فۆڕم")}>{sections.map((s, i) => <button key={s.id} disabled={i > step} aria-current={i === step ? 'step' : undefined} onClick={() => setForm('step', i)}><span>{t(i < step ? '✓' : s.icon)}</span><small>{t(s.title)}</small></button>)}</nav><p className="validation-note" role="status">{t(remaining ? `${remaining} پرسیار ماوە؛ هەموویان وەڵام بدەرەوە تا دواتر چالاک بێت.` : 'ئەم بەشەت تەواو کرد ✓')}</p><QuestionsForm {...{
              currentSection,
              currentQuestions,
              answers,
              extraTexts,
              handleAnswer,
              step,
              canProceed,
              handleNext
            }} setExtraTexts={n => setForm('extraTexts', n)} handlePrev={() => setForm('step', Math.max(0, step - 1))} /><p className="muted"><Message source="هەموو پرسیارەکان پێویستن. ئەگەر ڕێگری نییە بنووسە «نییە». بۆ دوو وەڵامی یەکەمی بیرچوونەوە، ناوی وانەکەش بنووسە. درێژی نووسینەکان نمرەت ناگۆڕێت." /></p></div> : <ReportCard {...{
            studentName,
            scores,
            answers,
            extraTexts,
            handleReset
          }} setStudentName={n => setForm('studentName', n)} handleDownloadText={() => downloadFile(`rapwrt-${today}.txt`, reportText())} handleShare={() => {
            setShareName(false);
            setShareAnswers(false);
            setShareOpen(true);
          }} onOpenPlan={openPlan} onOpenLearning={openLearning} onEdit={() => setForm('step', 0)} />}</>}
 {tab === 'learning' && <><PageTitle title={t("ڕێگای فێربوون")} subtitle={t("بزانە چی دەزانیت، بە نموونە و ڕاهێنان فێر ببە، پاشان بە پرسیاری نوێ دووبارە تاقی بکەرەوە.")} /><LearningPath {...{
            learning,
            setLearning
          }} onOpenPlan={openPlanFromLearning} onAskSupport={openSupport} /></>}
 {tab === 'plan' && <><PageTitle title={t("پلانی من")} subtitle={t("کات، وانە، ژینگە و ئامانجێکی ڕوون بۆ هەفتەکەت.")} /><ProfileEditor profile={profile} setProfile={n => setField('profile', n)} /><PersonalPlan {...{
            profile,
            plan,
            setPlan,
            checkins,
            setCheckins,
            sessions
          }} scores={latestScores} onOpenTools={() => setTab('tools')} onOpenLearning={openLearning} /></>}
 {tab === 'tools' && <><PageTitle title={t("ئامرازەکانی خوێندن")} subtitle={t("بیرخستنەوە، دووبارەکردنەوە و ڕاهێنان لەگەڵ خشتە و کاتژمێر.")} /><StudyTools {...{
            profile,
            sessions,
            setSessions,
            tools,
            setTools
          }} /></>}
 {tab === 'progress' && <><PageTitle title={t("پێشکەوتنی من")} subtitle={t("تۆماری هەوڵ و ئەنجامی ڕاهێنانەکان جیاواز ببینە.")} /><ProgressDashboard {...{
            plan,
            checkins,
            sessions,
            attempts,
            learningSummary
          }} currentScoringVersion={SCORING_VERSION} onReassess={handleReset} /><LearningSummaryView summary={learningSummary} onOpenLearning={openLearning} /></>}
 {tab === 'support' && <><PageTitle title={t("پشتگیری و هەنگاوی داهاتوو")} subtitle={t("هۆکاری قورساییەکە هەڵبژێرە؛ یارمەتییەکە بە پێویستی تۆ بگونجێت.")} /><SupportCenter {...{
            studentName,
            feedback
          }} setFeedback={n => setField('feedback', n)} onOpenLearning={openLearning} onOpenPlan={openPlan} onDownload={downloadFile} /></>}
 {tab === 'settings' && <><PageTitle title={t("ڕێکخستن و نهێنی")} subtitle={t("کۆنترۆڵی زانیاری و شێوازی بەکارهێنان لە دەستی خۆتە.")} /><Settings {...{
            preferences,
            setPreferences,
            exportBackup,
            deleteEverything
          }} onImport={() => importRef.current?.click()} /></>}
 <input type="file" accept=".json,application/json" ref={importRef} onChange={importBackup} hidden aria-label={t("گەڕاندنەوەی پاشەکەوت")} /><footer className="footer print:hidden"><span><Message source="هاوڕێ؛ بۆ هەنگاوە بچووکە گرنگەکانت." /></span><button onClick={() => setTab('settings')}><Message source="نهێنی و زانیارییەکانت" /></button></footer></main></div>
 {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} {...{
      shareName,
      setShareName,
      shareAnswers,
      setShareAnswers
    }} preview={reportText(shareName, shareAnswers)} onShare={share} onDownload={() => downloadFile('hawre-share.txt', reportText(shareName, shareAnswers))} />}</div>;
}
function PageTitle({
  title,
  subtitle
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return <div className="page-title"><span className="eyebrow"><Message source="هەنگاو بە هەنگاو، لەگەڵ تۆ" /></span><h1>{t(title)}</h1><p>{t(subtitle)}</p></div>;
}
function Metric({
  value,
  label
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return <div className="metric"><strong>{t(value)}</strong><small>{t(label)}</small></div>;
}
function ProfileEditor({
  profile,
  setProfile
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const update = (key, value) => setProfile(p => ({
    ...p,
    [key]: value,
    sourceUI: Object.fromEntries(Object.entries(p.sourceUI || {}).filter(([field]) => field !== key))
  }));
  return <section className="panel"><h2><Message source="بارودۆخی خوێندنت" /></h2><div className="form-grid"><label><Message source="پۆل / قۆناغ{p0}" values={{
          p0: <input className="input" value={profile.grade} maxLength={80} onChange={e => update('grade', e.target.value)} placeholder={t("بۆ نموونە: پۆلی ١٢")} />
        }} /></label><label><Message source="وانەی سەرەکی{p0}" values={{
          p0: <input className="input" value={localizedField(profile, 'subject', t)} maxLength={100} onChange={e => update('subject', e.target.value)} placeholder={t("بۆ نموونە: بیرکاری")} />
        }} /></label><label><Message source="کاتی بەردەست لە ڕۆژێکدا{p0}" values={{
          p0: <select className="input" value={profile.dailyMinutes} onChange={e => update('dailyMinutes', Number(e.target.value))}>{[10, 15, 20, 30, 45, 60, 90, 120, 180].map(n => <option key={n} value={n}><Message source="{p0} خولەک" values={{
                p0: t(n)
              }} /></option>)}</select>
        }} /></label><label><Message source="ژینگەی خوێندن{p0}" values={{
          p0: <select className="input" value={profile.environment} onChange={e => update('environment', e.target.value)}><option value="quiet"><Message source="شوێنی هێمنم هەیە" /></option><option value="shared"><Message source="شوێنەکە هاوبەشە" /></option><option value="noisy"><Message source="شوێنەکە ژاوەژاوە" /></option></select>
        }} /></label><label className="full-width"><Message source="ئامانجی فێربوونی هەفتەکە{p0}" values={{
          p0: <input className="input" value={localizedField(profile, 'goal', t)} maxLength={500} onChange={e => update('goal', e.target.value)} placeholder={t("بۆ نموونە: بتوانم سێ پرسیاری کەرت بەبێ یارمەتی چارەسەر بکەم")} />
        }} /></label><label className="check-label full-width"><Message source="{p0}لەگەڵ خوێندن کار یان بەرپرسیارێتی خێزانیم هەیە" values={{
          p0: <input type="checkbox" checked={profile.works} onChange={e => update('works', e.target.checked)} />
        }} /></label></div></section>;
}
function LearningSummaryView({
  summary,
  onOpenLearning
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return <section className="panel"><h2><Message source="بەڵگەی فێربوون" /></h2><p><Message source="ژمارەی دانیشتن و کات بە تەنها فێربوون ناپێون. لە بەشی فێربووندا وەڵامی پرسیارەکان و پشکنینی دواتر جیا تۆمار دەکرێن." /></p><button className="btn btn-primary" onClick={onOpenLearning}><Message source="بینینی ڕاهێنان و ئەنجامەکان" /></button></section>;
}
function ShareDialog({
  onClose,
  shareName,
  setShareName,
  shareAnswers,
  setShareAnswers,
  preview,
  onShare,
  onDownload
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} className="share-dialog" aria-labelledby="share-title" onCancel={onClose}><div className="section-heading"><h2 id="share-title"><Message source="چی هاوبەش دەکەیت؟" /></h2><button className="icon-btn" onClick={onClose} aria-label={t("داخستن")}>×</button></div><label className="check-label"><Message source="{p0}ناوی قوتابی زیاد بکە" values={{
        p0: <input type="checkbox" checked={shareName} onChange={e => setShareName(e.target.checked)} />
      }} /></label><label className="check-label"><Message source="{p0}وەڵام و تێبینییە کەسییەکان زیاد بکە" values={{
        p0: <input type="checkbox" checked={shareAnswers} onChange={e => setShareAnswers(e.target.checked)} />
      }} /></label><pre className="share-preview">{preview}</pre><div className="action-row"><button className="btn btn-primary" onClick={onShare}><Message source="هاوبەشکردن / کۆپی" /></button><button className="btn btn-secondary" onClick={onDownload}><Message source="داگرتنی دەقی هەڵبژێردراو" /></button></div></dialog>;
}
