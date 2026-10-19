import { useEffect, useState } from 'react';
import { adaptFuturePlan, addDays, allPlanTasks, createPlan, displayDate, localDate, studyAreas } from '../utils/planning';

const moods = [
  { value: 'easy', label: 'ئاسان و گونجاو بوو', icon: '☀️' },
  { value: 'okay', label: 'مامناوەند بوو', icon: '🌤️' },
  { value: 'hard', label: 'قورس بوو', icon: '🌦️' },
];

export default function PersonalPlan({ profile = {}, scores = [], plan, setPlan, checkins = [], setCheckins, sessions = [], onOpenTools }) {
  const today = localDate();
  const savedCheckin = checkins.find(item => item.date === today);
  const [mood, setMood] = useState(savedCheckin?.mood || '');
  const [note, setNote] = useState(savedCheckin?.note || '');
  const [minutes, setMinutes] = useState(plan?.dailyMinutes || profile.dailyMinutes || 30);
  const [startDate, setStartDate] = useState(today);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => { setMood(savedCheckin?.mood || ''); setNote(savedCheckin?.note || ''); }, [today, savedCheckin?.mood, savedCheckin?.note]);
  useEffect(() => { setMinutes(plan?.dailyMinutes || profile.dailyMinutes || 30); }, [plan?.dailyMinutes, profile.dailyMinutes]);

  const currentTasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const allTasks = allPlanTasks(plan);
  const completed = currentTasks.filter(task => task.done).length;
  const todayCompleted = allTasks.filter(task => task.done && (task.completedDate || task.date) === today).length;
  const todaySessionMinutes = sessions.filter(session => session.date === today).reduce((total, session) => total + Number(session.minutes || 0), 0);
  const dates = [...new Set(currentTasks.map(task => task.date))].sort();
  const validMinutes = Number.isFinite(Number(minutes)) && Number(minutes) >= 10 && Number(minutes) <= 180;
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate >= today;

  function buildPlan(event) {
    event.preventDefault();
    if (!validMinutes || !validStart) return;
    setPlan(previous => {
      const next = createPlan({ ...profile, dailyMinutes: Number(minutes) }, scores, startDate);
      const previousCompleted = allPlanTasks(previous).filter(task => task.done);
      const completeMap = new Map(previousCompleted.map(task => [task.id, task]));
      next.tasks = next.tasks.map(task => completeMap.get(task.id) || task);
      const currentIds = new Set(next.tasks.map(task => task.id));
      next.historyTasks = previousCompleted.filter(task => !currentIds.has(task.id)).slice(-300);
      return next;
    });
    setEditing(false);
    setMessage('پلانی ٧ ڕۆژەکەت ئامادەیە. هەنگاوەکان بەپێی بارودۆخت ڕێک بخە.');
  }

  function toggleTask(id) {
    setPlan(previous => previous ? { ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, done: !task.done, completedDate: task.done ? null : today } : task) } : previous);
  }

  function updateTaskMinutes(id, rawValue) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 1 || value > 180) return;
    setPlan(previous => previous ? { ...previous, tasks: previous.tasks.map(task => task.id === id && !task.done ? { ...task, minutes: Math.round(value) } : task) } : previous);
  }

  function saveCheckin(event) {
    event.preventDefault();
    if (!moods.some(item => item.value === mood)) return;
    const entry = { id: savedCheckin?.id || `checkin-${today}`, date: today, mood, note: note.trim(), completedCount: todayCompleted };
    setCheckins(previous => [...previous.filter(item => item.date !== today), entry].slice(-365));
    if (mood === 'hard') {
      const willAdjust = plan && !(plan.adjustedDates || []).includes(today) && currentTasks.some(task => !task.done && task.date > today);
      setPlan(previous => adaptFuturePlan(previous, today));
      setMessage(willAdjust ? 'تۆمار کرا. کاتی ئەرکە نەتەواوەکانی ڕۆژانی داهاتوو کەم کرایەوە؛ دەتوانیت خۆتیش ڕێکی بخەیت.' : 'تۆمار کرا. هەنگاوێکی بچووک هەڵبژێرە؛ دەتوانیت کاتی هەر ئەرکێک بەپێی توانای ئەمڕۆت کەم بکەیت.');
    } else {
      setMessage('تۆمار کرا. هەوڵەکانت گرنگن؛ هەنگاوێکی بچووکیش پێشکەوتنە.');
    }
  }

  return <div className="stack" dir="rtl">
    <section className="panel">
      <div className="section-heading"><div><span className="badge">هەنگاوێک بۆ هەر ڕۆژ</span><h2>پلانی کەسیی ٧ ڕۆژە</h2><p className="muted">ئامانجەکەمان دەستپێکردن و فێربوونە. ئەگەر ڕۆژێک نەکرا، لە هەنگاوێکی گونجاو بەردەوام بە.</p></div><span aria-hidden="true" style={{ fontSize: '2rem' }}>🌱</span></div>
      <div className="grid-two"><p><strong>وانە:</strong> {profile.subject || 'دەتوانیت وانەی دڵخوازت هەڵبژێریت'}</p><p><strong>ئامانج:</strong> {profile.goal || 'هەنگاوێکی بچووک بەرەو خوێندنی باشتر'}</p></div>
      {profile.works && <p className="muted">لەبەر کار و بەرپرسیارێتییەکانت، هەر ڕۆژ تەنها دوو ئەرکی سەرەکی دانراوە.</p>}
      {profile.environment && profile.environment !== 'quiet' && <p className="muted">پلانت پێویستی بە ژووری تایبەت نییە؛ هەنگاوەکان بۆ ماوەی کورت و کاتی گونجاوی خۆت دانراون.</p>}
      {plan?.reason && <div className="empty-state" style={{ textAlign: 'start' }}><strong>بۆچی ئەم پلانە؟</strong><p>{plan.reason}</p><small className="muted">ئەم هەنگاوانە بەپێی وەڵامەکان و بارودۆخت ڕێکخراون؛ دەتوانیت کاتەکان بگۆڕیت.</small></div>}
      {!plan && <div className="empty-state"><p>بە کاتێکی گونجاو دەست پێ بکە. دەتوانیت هەر ئەرکێک کورتتر بکەیت.</p></div>}
      {plan && <div className="section-heading"><p><strong>{completed}</strong> لە <strong>{currentTasks.length}</strong> ئەرک تەواو کراوە</p><button className="btn btn-secondary" type="button" onClick={() => setEditing(!editing)} aria-expanded={editing}>ڕێکخستنی پلان</button></div>}
      {(!plan || editing) && <form onSubmit={buildPlan} className="stack">
        <div className="grid-two"><label>کاتی ڕۆژانە بە خولەک<input className="input" type="number" min="10" max="180" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} required /></label><label>ڕۆژی دەستپێکردن<input className="input" type="date" min={today} value={startDate} onChange={event => setStartDate(event.target.value)} required /></label></div>
        <p className="muted">هەر ڕۆژ ٢ یان ٣ ئەرک، لە کۆی کاتە هەڵبژێردراوەکەتدا. کاتی پشوو دەتوانیت بە پێویستی خۆت زیاد بکەیت. ئەرکە تەواوکراوەکان لە مێژوودا دەمێننەوە.</p>
        <div><button className="btn btn-primary" disabled={!validMinutes || !validStart} type="submit">{plan ? 'پلانی ٧ ڕۆژی داهاتوو ئامادە بکە' : 'پلانی من ئامادە بکە'}</button></div>
      </form>}
      {plan && <progress value={completed} max={Math.max(1, currentTasks.length)} aria-label="ئەرکە تەواوکراوەکانی پلانی ئێستا" style={{ width: '100%', accentColor: 'var(--accent, #2563eb)' }} />}
      <p role="status" aria-live="polite">{message}</p>
    </section>

    {dates.map((date, dayIndex) => {
      const tasks = currentTasks.filter(task => task.date === date);
      const dayDone = tasks.filter(task => task.done).length;
      return <section className="panel plan-day" key={date} aria-labelledby={`plan-day-${date}`}>
        <div className="section-heading"><div><span className="badge">ڕۆژی {dayIndex + 1}{date === today ? ' · ئەمڕۆ' : ''}</span><h3 id={`plan-day-${date}`}>{displayDate(date, { weekday: 'long' })}</h3></div><span className="muted">{tasks.reduce((sum, task) => sum + task.minutes, 0)} خولەک · {dayDone}/{tasks.length} تەواو</span></div>
        <div className="stack">{tasks.map(task => <div className={`task-row${task.done ? ' task-complete' : ''}`} key={task.id} style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
          <input id={`task-${task.id}`} type="checkbox" checked={Boolean(task.done)} onChange={() => toggleTask(task.id)} style={{ width: '1.25rem', height: '1.25rem', flex: '0 0 auto', marginTop: '.25rem', accentColor: 'var(--accent, #2563eb)' }} />
          <div style={{ flex: 1, minWidth: 0 }}><label htmlFor={`task-${task.id}`} style={{ fontWeight: 650, cursor: 'pointer', textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</label><p className="muted" style={{ fontSize: '.85rem', marginTop: '.4rem' }}>{task.why}</p><div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem' }}><span className="badge">{studyAreas[task.category] || 'ڕاهێنان'}</span>{task.done ? <span className="muted">{task.minutes} خولەک · تەواو کراوە ✓</span> : <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><input className="input" aria-label={`کاتی ئەرک: ${task.title}`} type="number" min="1" max="180" value={task.minutes} onChange={event => updateTaskMinutes(task.id, event.target.value)} style={{ width: '5rem', margin: 0 }} /> خولەک</label>}{task.adjusted && <span className="muted">کاتەکە ئاسانتر کراوە</span>}</div></div>
        </div>)}</div>
        {onOpenTools && <button className="btn btn-secondary" type="button" onClick={() => onOpenTools('timer')}>ئامرازەکانی خوێندن بکەرەوە ←</button>}
      </section>;
    })}

    <section className="panel">
      <div className="section-heading"><div><span className="badge">یەک خولەک بۆ خۆت</span><h2>بەدواداچوونی ئەمڕۆ</h2><p className="muted">{displayDate(today, { weekday: 'long' })} · {todayCompleted} ئەرک تەواو کراوە · {todaySessionMinutes} خولەک لە کاتژمێر تۆمار کراوە</p></div><span aria-hidden="true" style={{ fontSize: '2rem' }}>📝</span></div>
      <form onSubmit={saveCheckin} className="stack"><fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontWeight: 650, marginBottom: '.75rem' }}>ئەرکەکانی ئەمڕۆ چۆن بوون؟</legend><div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>{moods.map(item => <label key={item.value} className="btn btn-secondary" style={{ borderColor: mood === item.value ? 'var(--accent, #2563eb)' : undefined }}><input type="radio" name="daily-mood" value={item.value} checked={mood === item.value} onChange={() => setMood(item.value)} required /> <span aria-hidden="true">{item.icon}</span> {item.label}</label>)}</div></fieldset>
        <label>چی یارمەتیدایت؟ چی قورس بوو؟ <span className="muted">(ئارەزوومەندانە)</span><textarea className="input" rows="3" maxLength="1500" value={note} onChange={event => setNote(event.target.value)} placeholder="دەتوانیت تەنها یەک ڕستە بنووسیت…" /></label>
        <p className="muted">ئەگەر «قورس بوو» هەڵبژێریت، کاتی ئەرکە نەتەواوەکانی ڕۆژانی داهاتوو نزیکەی چارەکێک کەم دەکرێتەوە؛ هەر ڕۆژ تەنها جارێک. ڕۆژێکی پچڕان هیچ سزایەکی نییە.</p>
        <div><button className="btn btn-primary" type="submit" disabled={!mood}>{savedCheckin ? 'بەدواداچوونی ئەمڕۆ نوێ بکەرەوە' : 'بەدواداچوونەکەم تۆمار بکە'}</button></div>
      </form>
      {plan && addDays(plan.startDate, 6) < today && <p className="muted">حەوت ڕۆژەکە کۆتایی هاتووە. دەتوانیت بە «ڕێکخستنی پلان» هەفتەیەکی نوێ ئامادە بکەیت؛ مێژووی ئەرکە تەواوکراوەکانت دەپارێزرێت.</p>}
    </section>
  </div>;
}
