import { localizedField } from '../utils/authoredText.js';
import { translatePlanText } from '../i18n/runtime.js';
import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { useEffect, useState } from 'react';
import { adaptFuturePlan, addDays, allPlanTasks, createPlan, displayDate, localDate, studyAreas, supportForReason, supportReasons } from '../utils/planning';
const moods = [{
  value: 'easy',
  label: 'ئاسان و گونجاو بوو',
  icon: '☀️'
}, {
  value: 'okay',
  label: 'مامناوەند بوو',
  icon: '🌤️'
}, {
  value: 'hard',
  label: 'قورس بوو',
  icon: '🌦️'
}];
export default function PersonalPlan({
  profile = {},
  scores = [],
  plan,
  setPlan,
  checkins = [],
  setCheckins,
  sessions = [],
  onOpenTools,
  onOpenLearning
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const today = localDate();
  const saved = checkins.find(item => item.date === today);
  const [mood, setMood] = useState(saved?.mood || '');
  const [supportReason, setSupportReason] = useState(saved?.supportReason || '');
  const [note, setNote] = useState(saved?.note || '');
  const [minutes, setMinutes] = useState(plan?.dailyMinutes || profile.dailyMinutes || 30);
  const [startDate, setStartDate] = useState(today);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setMood(saved?.mood || '');
    setSupportReason(saved?.supportReason || '');
    setNote(saved?.note || '');
  }, [today, saved?.mood, saved?.supportReason, saved?.note]);
  useEffect(() => {
    setMinutes(plan?.dailyMinutes || profile.dailyMinutes || 30);
  }, [plan?.dailyMinutes, profile.dailyMinutes]);
  const currentTasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const allTasks = allPlanTasks(plan);
  const completed = currentTasks.filter(task => task.done).length;
  const todayCompleted = allTasks.filter(task => task.done && (task.completedDate || task.date) === today).length;
  const sessionMinutes = sessions.filter(session => session.date === today).reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0);
  const dates = [...new Set(currentTasks.map(task => task.date))].sort();
  const validMinutes = Number.isFinite(Number(minutes)) && Number(minutes) >= 10 && Number(minutes) <= 180;
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && localDate(startDate) === startDate && startDate >= today;
  const guidance = mood === 'hard' ? supportForReason(supportReason) : null;
  const validReason = supportReasons.some(reason => reason.id === supportReason);
  function buildPlan(event) {
    event.preventDefault();
    if (!validMinutes || !validStart) return;
    setPlan(previous => {
      const next = createPlan({
        ...profile,
        dailyMinutes: Number(minutes)
      }, scores, startDate);
      const previousCompleted = allPlanTasks(previous).filter(task => task.done);
      const completeMap = new Map(previousCompleted.map(task => [task.id, task]));
      next.tasks = next.tasks.map(task => completeMap.get(task.id) || task);
      const currentIds = new Set(next.tasks.map(task => task.id));
      next.historyTasks = previousCompleted.filter(task => !currentIds.has(task.id)).slice(-300);
      // Keep the daily adjustment guard when the student explicitly chooses a new plan.
      next.adjustedDates = Array.isArray(previous?.adjustedDates) ? previous.adjustedDates.slice(-60) : [];
      return next;
    });
    setEditing(false);
    setMessage('پلانی ٧ ڕۆژەکەت ئامادەیە. هەنگاوەکان بەپێی بارودۆخت ڕێک بخە.');
  }
  function toggleTask(id) {
    setPlan(previous => previous ? {
      ...previous,
      tasks: previous.tasks.map(task => task.id === id ? {
        ...task,
        done: !task.done,
        completedDate: task.done ? null : today
      } : task)
    } : previous);
  }
  function updateMinutes(id, rawValue) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 1 || value > 180) return;
    setPlan(previous => previous ? {
      ...previous,
      tasks: previous.tasks.map(task => task.id === id && !task.done ? {
        ...task,
        minutes: Math.round(value)
      } : task)
    } : previous);
  }
  function saveCheckin(event) {
    event.preventDefault();
    if (!moods.some(item => item.value === mood) || mood === 'hard' && !validReason) return;
    const entry = {
      id: saved?.id || `checkin-${today}`,
      date: today,
      mood,
      note: note.trim(),
      completedCount: todayCompleted,
      supportReason: mood === 'hard' ? supportReason : '',
      supportAction: guidance?.title || ''
    };
    setCheckins(previous => [...previous.filter(item => item.date !== today), entry].slice(-365));
    if (mood === 'hard') {
      const changesTime = ['time', 'tired'].includes(supportReason);
      const willAdjust = changesTime && plan && !(plan.adjustedDates || []).includes(today) && currentTasks.some(task => !task.done && task.date > today);
      if (changesTime) setPlan(previous => adaptFuturePlan(previous, today, supportReason));
      setMessage(willAdjust ? 'تۆمار کرا. کاتی ئەرکە نەتەواوەکانی ڕۆژانی داهاتوو کەم کرایەوە. ڕێنماییە گونجاوەکە لە خوارەوە ببینە.' : 'تۆمار کرا. بەپێی هۆکارەکە، هەنگاوە گونجاوەکانی خوارەوە تاقی بکەرەوە.');
    } else {
      setMessage('تۆمار کرا. ئەو ڕێگایەی یارمەتیداویت بەردەوامی پێ بدە و بەپێی پێویست ڕێکی بخە.');
    }
  }
  return <div className="stack" dir={direction}>
    <section className="panel">
      <div className="section-heading"><div><span className="badge"><Message source="هەنگاوێک بۆ هەر ڕۆژ" /></span><h2><Message source="پلانی کەسیی ٧ ڕۆژە" /></h2><p className="muted"><Message source="ئامانجەکە فێربوون و پلانی گونجاوە، نە زیادکردنی هەمیشەیی کات. ڕۆژێک نەکرا، بە هەنگاوێکی بچووک بەردەوام بە." /></p></div><span aria-hidden="true" style={{
          fontSize: '2rem'
        }}>🌱</span></div>
      <div className="grid-two"><p><strong><Message source="وانە:" /></strong> {localizedField(profile, 'subject', t) || t('وانەیەکی دڵخوازت هەڵبژێرە')}</p><p><strong><Message source="ئامانج:" /></strong> {localizedField(profile, 'goal', t) || t('هەنگاوێکی بچووک بەرەو فێربوونی باشتر')}</p></div>
      {profile.works && <p className="muted"><Message source="لەبەر کار و بەرپرسیارێتییەکانت، هەر ڕۆژ دوو ئەرکی سەرەکی دانراوە." /></p>}
      {profile.environment && profile.environment !== 'quiet' && <p className="muted"><Message source="پلانت پێویستی بە ژووری تایبەت نییە؛ کات و ئامرازەکان بەپێی ئەوەی بەردەستتە هەڵبژێرە." /></p>}
      {plan?.reason && <div className="empty-state" style={{
        textAlign: 'start'
      }}><strong><Message source="بۆچی ئەم پلانە؟" /></strong><p>{t(plan.reason)}</p><small className="muted"><Message source="پێشنیارەکان بەپێی وەڵام و بارودۆخت ڕێکخراون؛ دەتوانیت بگۆڕیت." /></small></div>}
      {plan && <div className="section-heading"><p><Message source="{p0} لە {p1} ئەرک تەواو کراوە" values={{
            p0: <strong>{t(completed)}</strong>,
            p1: <strong>{t(currentTasks.length)}</strong>
          }} /></p><button className="btn btn-secondary" type="button" onClick={() => setEditing(!editing)} aria-expanded={editing}><Message source="ڕێکخستنی پلان" /></button></div>}
      {(!plan || editing) && <form onSubmit={buildPlan} className="stack"><div className="grid-two"><label><Message source="کاتی ڕۆژانە بە خولەک{p0}" values={{
              p0: <input className="input" type="number" min="10" max="180" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} required />
            }} /></label><label><Message source="ڕۆژی دەستپێکردن{p0}" values={{
              p0: <input className="input" type="date" min={today} value={startDate} onChange={event => setStartDate(event.target.value)} required />
            }} /></label></div><p className="muted"><Message source="هەر ڕۆژ ٢ یان ٣ ئەرک لە کۆی کاتە هەڵبژێردراوەکەتدا. کاتی درێژ بکە بە چەند دانیشتنێکی کورت و پشوو. ئەرکە تەواوکراوەکان لە مێژوودا دەمێننەوە." /></p><div><button className="btn btn-primary" disabled={!validMinutes || !validStart} type="submit">{t(plan ? 'پلانی ٧ ڕۆژی داهاتوو ئامادە بکە' : 'پلانی من ئامادە بکە')}</button></div></form>}
      {plan && <progress value={completed} max={Math.max(1, currentTasks.length)} aria-label={t("ئەرکە تەواوکراوەکانی پلانی ئێستا")} style={{
        width: '100%',
        accentColor: 'var(--accent, #2563eb)'
      }} />}
      <p role="status" aria-live="polite">{t(message)}</p>
    </section>

    {dates.map((date, index) => {
      const tasks = currentTasks.filter(task => task.date === date);
      return <section className="panel plan-day" key={date} aria-labelledby={`plan-day-${date}`}><div className="section-heading"><div><span className="badge"><Message source="ڕۆژی {p0}{p1}" values={{
                p0: t(index + 1),
                p1: t(date === today ? ' · ئەمڕۆ' : '')
              }} /></span><h3 id={`plan-day-${date}`}>{t(displayDate(date, {
                weekday: 'long'
              }, locale))}</h3></div><span className="muted"><Message source="{p0} خولەک · {p1}/{p2} تەواو" values={{
              p0: t(tasks.reduce((sum, task) => sum + task.minutes, 0)),
              p1: t(tasks.filter(task => task.done).length),
              p2: t(tasks.length)
            }} /></span></div><div className="stack">{tasks.map(task => <div className={`task-row${task.done ? ' task-complete' : ''}`} key={task.id} style={{
            display: 'flex',
            gap: '.75rem',
            alignItems: 'flex-start'
          }}><input id={`task-${task.id}`} type="checkbox" checked={Boolean(task.done)} onChange={() => toggleTask(task.id)} style={{
              width: '1.25rem',
              height: '1.25rem',
              flex: '0 0 auto',
              marginTop: '.25rem',
              accentColor: 'var(--accent, #2563eb)'
            }} /><div style={{
              flex: 1,
              minWidth: 0
            }}><label htmlFor={`task-${task.id}`} style={{
                fontWeight: 650,
                cursor: 'pointer',
                textDecoration: task.done ? 'line-through' : 'none'
              }}>{translatePlanText(plan, task.title, locale)}</label><p className="muted" style={{
                fontSize: '.85rem',
                marginTop: '.4rem'
              }}>{t(task.why)}</p><div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '.5rem'
              }}><span className="badge">{t(studyAreas[task.category] || 'ڕاهێنان')}</span>{task.done ? <span className="muted"><Message source="{p0} خولەک · تەواو کراوە ✓" values={{
                    p0: t(task.minutes)
                  }} /></span> : <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.4rem'
                }}><Message source="{p0} خولەک" values={{
                    p0: <input className="input" aria-label={t('کاتی ئەرک: {p0}', { p0: translatePlanText(plan, task.title, locale) })} type="number" min="1" max="180" value={task.minutes} onChange={event => updateMinutes(task.id, event.target.value)} style={{
                      width: '5rem',
                      margin: 0
                    }} />
                  }} /></label>}{task.adjusted && <span className="muted"><Message source="کاتەکە ئاسانتر کراوە" /></span>}</div></div></div>)}</div><div style={{
          display: 'flex',
          gap: '.5rem',
          flexWrap: 'wrap'
        }}>{onOpenTools && <button className="btn btn-secondary" type="button" onClick={() => onOpenTools('timer')}><Message source="ئامرازەکانی خوێندن ←" /></button>}{onOpenLearning && <button className="btn btn-secondary" type="button" onClick={() => onOpenLearning()}><Message source="فێربوون و ڕاهێنان ←" /></button>}</div></section>;
    })}

    <section className="panel">
      <div className="section-heading"><div><span className="badge"><Message source="یەک خولەک بۆ خۆت" /></span><h2><Message source="بەدواداچوونی ئەمڕۆ" /></h2><p className="muted"><Message source="{p0} · {p1} ئەرک تەواو کراوە · {p2} خولەک لە کاتژمێر تۆمار کراوە" values={{
              p0: t(displayDate(today, {
                weekday: 'long'
              }, locale)),
              p1: t(todayCompleted),
              p2: t(sessionMinutes)
            }} /></p></div><span aria-hidden="true" style={{
          fontSize: '2rem'
        }}>📝</span></div>
      <form onSubmit={saveCheckin} className="stack"><fieldset style={{
          border: 0,
          padding: 0,
          margin: 0
        }}><legend style={{
            fontWeight: 650,
            marginBottom: '.75rem'
          }}><Message source="ئەرکەکانی ئەمڕۆ چۆن بوون؟" /></legend><div style={{
            display: 'flex',
            gap: '.65rem',
            flexWrap: 'wrap'
          }}>{moods.map(item => <label key={item.value} className="btn btn-secondary" style={{
              borderColor: mood === item.value ? 'var(--accent, #2563eb)' : undefined
            }}><input type="radio" name="daily-mood" value={item.value} checked={mood === item.value} onChange={() => setMood(item.value)} required /> <span aria-hidden="true">{t(item.icon)}</span> {t(item.label)}</label>)}</div></fieldset>
        {mood === 'hard' && <label><Message source="چی وای کرد قورس بێت؟{p0}" values={{
            p0: <select className="input" value={supportReason} onChange={event => setSupportReason(event.target.value)} required><option value=""><Message source="هۆکاری سەرەکی هەڵبژێرە…" /></option>{supportReasons.map(reason => <option key={reason.id} value={reason.id}>{t(reason.label)}</option>)}</select>
          }} /></label>}
        <label><Message source="چی یارمەتیدایت؟ چی قورس بوو؟ {p0}{p1}" values={{
            p0: <span className="muted"><Message source="(ئارەزوومەندانە)" /></span>,
            p1: <textarea className="input" rows="3" maxLength="1500" value={note} onChange={event => setNote(event.target.value)} placeholder={t("دەتوانیت تەنها یەک ڕستە بنووسیت…")} />
          }} /></label>
        <p className="muted"><Message source="هۆکارەکە جۆری یارمەتی دیاری دەکات: تێنەگەیشتن پێویستی بە ڕوونکردنەوە و ڕاهێنان هەیە؛ تەنها کەمی کات یان ماندووبوون کاتی ئەرکە داهاتووەکان کەم دەکاتەوە. هیچ سزایەک بۆ ڕۆژی پچڕان نییە." /></p><div><button className="btn btn-primary" type="submit" disabled={!mood || mood === 'hard' && !validReason}>{t(saved ? 'بەدواداچوونی ئەمڕۆ نوێ بکەرەوە' : 'بەدواداچوونەکەم تۆمار بکە')}</button></div>
      </form>
      {guidance && <aside className="empty-state" style={{
        textAlign: 'start'
      }} aria-label={t("یارمەتی بەپێی هۆکارەکە")}><h3>{t(guidance.title)}</h3><ol>{guidance.steps.map(step => <li key={step} style={{
            marginBlock: '.5rem'
          }}>{t(step)}</li>)}</ol>{guidance.action === 'learning' && onOpenLearning && <button className="btn btn-primary" type="button" onClick={() => onOpenLearning()}>{t(guidance.actionLabel)}</button>}{guidance.action === 'tools' && onOpenTools && <button className="btn btn-secondary" type="button" onClick={() => onOpenTools('timer')}>{t(guidance.actionLabel)}</button>}</aside>}
      {plan && addDays(plan.startDate, 6) < today && <p className="muted"><Message source="حەوت ڕۆژەکە کۆتایی هاتووە. لە «ڕێکخستنی پلان» هەفتەیەکی نوێ ئامادە بکە؛ مێژووی ئەرکە تەواوکراوەکانت دەپارێزرێت." /></p>}
    </section>
  </div>;
}
