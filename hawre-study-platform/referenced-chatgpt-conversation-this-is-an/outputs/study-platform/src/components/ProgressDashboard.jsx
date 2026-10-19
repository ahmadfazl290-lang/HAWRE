import { addDays, allPlanTasks, displayDate, localDate, studyAreas } from '../utils/planning';

const moodLabels = { easy: 'ئاسان و گونجاو بوو ☀️', okay: 'مامناوەند بوو 🌤️', hard: 'قورس بوو 🌦️' };

export default function ProgressDashboard({ plan, checkins = [], sessions = [], attempts = [], onReassess }) {
  const today = localDate();
  const done = allPlanTasks(plan).filter(task => task.done);
  const minutes = sessions.reduce((total, session) => total + Math.max(0, Number(session.minutes) || 0), 0);
  const activeDays = new Set([...sessions.map(session => session.date), ...done.map(task => task.completedDate || task.date)]).size;
  const currentTasks = plan?.tasks || [];
  const currentDone = currentTasks.filter(task => task.done).length;
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const daily = dates.map(date => ({ date, minutes: sessions.filter(session => session.date === date).reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0), tasks: done.filter(task => (task.completedDate || task.date) === date).length }));
  const maxMinutes = Math.max(1, ...daily.map(day => day.minutes));
  const latestAttempt = attempts[attempts.length - 1];
  const previousAttempt = attempts.length > 1 ? attempts[attempts.length - 2] : null;
  const validScores = latestAttempt && Array.isArray(latestAttempt.scores) && latestAttempt.scores.length === 4 && latestAttempt.scores.every(value => Number.isFinite(Number(value)));
  const strengthIndex = validScores ? latestAttempt.scores.reduce((lowest, value, index, values) => Number(value) < Number(values[lowest]) ? index : lowest, 0) : null;
  const equalScores = validScores && latestAttempt.scores.every(value => Number(value) === Number(latestAttempt.scores[0]));
  const recentCheckins = [...checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return <div className="stack" dir="rtl">
    <section className="panel"><div className="section-heading"><div><span className="badge">هەر هەنگاوێک هەژمار دەکرێت</span><h2>پێشکەوتنی من</h2><p className="muted">ئەم ژمارانە تۆماری هەوڵەکانتن. نمرەی قوتابی یان پێوانەی بەهای تۆ نین.</p></div><span aria-hidden="true" style={{ fontSize: '2rem' }}>🌿</span></div>
      <div className="progress-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '1rem' }}>{[
        { value: done.length, label: 'ئەرکی تەواوکراو' },
        { value: minutes, label: 'خولەکی تۆمارکراو' },
        { value: sessions.length, label: 'دانیشتنی خوێندن' },
        { value: activeDays, label: 'ڕۆژی هەوڵدان' },
      ].map(metric => <div className="empty-state" key={metric.label} style={{ padding: '1rem' }}><strong style={{ display: 'block', fontSize: '2rem', color: 'var(--accent, #2563eb)' }}>{metric.value}</strong><span>{metric.label}</span></div>)}</div>
      <p className="muted">خولەکەکان لە کاتژمێری خوێندنەوە تۆمار دەکرێن؛ تەواوکردنی ئەرک بە تەنها خولەک زیاد ناکات. ڕۆژەکان بەبێ مەرجی بەردەوامی هەژمار دەکرێن.</p>
      {plan && <div><p><strong>پلانی ئێستا:</strong> {currentDone} لە {currentTasks.length} ئەرک تەواو کراوە</p><progress value={currentDone} max={Math.max(1, currentTasks.length)} aria-label="پێشکەوتنی پلانی ئێستا" style={{ width: '100%', accentColor: 'var(--accent, #2563eb)' }} /></div>}
    </section>

    <section className="panel"><div className="section-heading"><div><h2>هەوڵەکانی ٧ ڕۆژی ڕابردوو</h2><p className="muted">دانیشتنە تۆمارکراوەکان و ئەرکە تەواوکراوەکان؛ ڕۆژی بەتاڵ واتای تۆمارنەکراوە.</p></div></div>
      {minutes === 0 && done.length === 0 && <p className="empty-state">هێشتا هەوڵێک تۆمار نەکراوە. بە یەک ئەرکی بچووک یان دانیشتنێکی کورت دەست پێ بکە.</p>}
      <div className="stack">{daily.map(day => <div key={day.date} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(60px, 2fr) minmax(90px, 1fr)', alignItems: 'center', gap: '.65rem' }}><span style={{ fontSize: '.85rem' }}>{displayDate(day.date, { weekday: 'short' })}{day.date === today ? ' · ئەمڕۆ' : ''}</span><div role="img" aria-label={`${day.minutes} خولەکی خوێندن تۆمار کراوە`} style={{ background: 'var(--surface-soft, #eef2f8)', borderRadius: '99px', height: '.75rem', overflow: 'hidden' }}><div style={{ height: '100%', width: `${day.minutes / maxMinutes * 100}%`, background: 'var(--accent, #2563eb)', borderRadius: '99px' }} /></div><span className="muted" style={{ fontSize: '.8rem' }}>{day.minutes} خولەک · {day.tasks} ئەرک</span></div>)}</div>
    </section>

    <section className="panel"><div className="section-heading"><div><h2>خاڵە بەهێزەکان و وەڵامەکانت</h2><p className="muted">هەڵسەنگاندن یارمەتیت دەدات بوارەکانی ڕاهێنان هەڵبژێریت؛ دەستنیشانکردنی پزیشکی یان پێوانەی توانای تۆ نییە.</p></div>{onReassess && <button className="btn btn-secondary" type="button" onClick={onReassess}>{attempts.length ? 'هەڵسەنگاندن دووبارە بکەرەوە' : 'هەڵسەنگاندن دەست پێ بکە'}</button>}</div>
      {validScores ? <><div className="empty-state" style={{ textAlign: 'start' }}><strong>{equalScores ? 'شوێنێک بۆ دەستپێکردن' : `شوێنێک بۆ پشتبەستن: ${studyAreas[strengthIndex]}`}</strong><p>{equalScores ? 'وەڵامەکانت لە هەموو بوارەکان هەمان ڕێژە پیشان دەدەن. بوارێک هەڵبژێرە و بە هەنگاوێکی بچووک دەست پێ بکە.' : 'لە دوا وەڵامەکانتدا ئەم بوارە بە بەراورد لەگەڵ بوارەکانی تر کێشەی کەمتر پیشان دەدات. دەتوانیت هەمان ڕێکخستن و هەوڵ بۆ بوارەکانی تریش بەکار بهێنیت.'}</p>{done.length > 0 && <p>تۆ {done.length} ئەرکت تەواو کردووە؛ دەتوانیت ئەو ڕێگایانەی یارمەتییان داویت دووبارە بکەیتەوە.</p>}</div><p className="muted">دوا هەڵسەنگاندن: {displayDate(localDate(latestAttempt.date))} · ژمارەکان ڕێژەی نیشاندەرەکانی کێشەن؛ ژمارەی کەمتر واتای کێشەی کەمتر لە وەڵامەکانە.</p><div className="stack">{studyAreas.map((area, index) => {
        const score = Math.max(0, Math.min(100, Number(latestAttempt.scores[index])));
        const oldScore = previousAttempt && Number(previousAttempt.scores?.[index]);
        const difference = Number.isFinite(oldScore) ? score - oldScore : null;
        return <div key={area}><div className="section-heading" style={{ marginBottom: '.35rem' }}><span>{area}</span><strong>{score}%</strong></div><progress value={score} max="100" aria-label={`${area}: ${score} لە ١٠٠ نیشاندەری کێشە`} style={{ width: '100%', accentColor: 'var(--accent, #2563eb)' }} />{difference !== null && <small className="muted">{difference < 0 ? `${Math.abs(difference)} خاڵ کەمتر لە هەڵسەنگاندنی پێشوو` : difference > 0 ? `${difference} خاڵ زیاتر لە هەڵسەنگاندنی پێشوو؛ دەتوانین پلانەکە ئاسانتر بکەین` : 'لەگەڵ هەڵسەنگاندنی پێشوو یەکسانە'}</small>}</div>;
      })}</div><p className="muted">گۆڕینی ئەم ڕێژانە هەمیشە بە تەنها واتای گۆڕینی فێربوون نییە؛ وەڵام و بارودۆخیش دەگۆڕێن.</p></> : <div className="empty-state"><p>بە هەڵسەنگاندنی سەرەتایی دەتوانیت بوارەکانی ڕاهێنان بناسیت. هەوڵە ڕۆژانەکانتیش لێرە تۆمار دەبن.</p></div>}
    </section>

    <section className="panel"><h2>تێبینییەکانی من</h2><p className="muted">ئەوەی سوودی هەبووە دووبارەی بکەرەوە؛ ئەوەی قورس بووە بگۆڕە. تێبینییەکانت خۆکار لەگەڵ کەس هاوبەش ناکرێن.</p>{recentCheckins.length ? <div className="stack">{recentCheckins.map(checkin => <article className="task-row" key={checkin.id || checkin.date}><div className="section-heading"><strong>{displayDate(checkin.date, { weekday: 'long' })}</strong><span className="badge">{moodLabels[checkin.mood] || 'تێبینی'}</span></div>{checkin.note ? <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{checkin.note}</p> : <p className="muted">تێبینییەکی نووسراو زیاد نەکراوە.</p>}</article>)}</div> : <p className="empty-state">لە «پلانی من» بەدواداچوونی ئەمڕۆ تۆمار بکە، تا بزانیت چی یارمەتیت دەدات.</p>}</section>
  </div>;
}
