import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { addDays, allPlanTasks, displayDate, localDate, studyAreas, supportReasons } from '../utils/planning';
const moodLabels = {
  easy: 'ئاسان و گونجاو بوو ☀️',
  okay: 'مامناوەند بوو 🌤️',
  hard: 'قورس بوو 🌦️'
};
const CURRENT_SCORING = 'support-v2';
export default function ProgressDashboard({
  plan,
  checkins = [],
  sessions = [],
  attempts = [],
  onReassess,
  learningSummary,
  currentScoringVersion = CURRENT_SCORING
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const today = localDate();
  const done = allPlanTasks(plan).filter(task => task.done);
  const minutes = sessions.reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0);
  const activeDays = new Set([...sessions.map(session => session.date), ...done.map(task => task.completedDate || task.date)]).size;
  const currentTasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const currentDone = currentTasks.filter(task => task.done).length;
  const daily = Array.from({
    length: 7
  }, (_, index) => addDays(today, index - 6)).map(date => ({
    date,
    minutes: sessions.filter(session => session.date === date).reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0),
    tasks: done.filter(task => (task.completedDate || task.date) === date).length
  }));
  const maxMinutes = Math.max(1, ...daily.map(day => day.minutes));
  const latest = attempts[attempts.length - 1];
  const prior = attempts[attempts.length - 2];
  const validScores = latest && Array.isArray(latest.scores) && latest.scores.length === 4 && latest.scores.every(value => Number.isFinite(Number(value)));
  const latestVersion = typeof latest?.scoringVersion === 'string' ? latest.scoringVersion : '';
  const legacyScores = latestVersion !== currentScoringVersion;
  const sameVersion = Boolean(latestVersion && prior?.scoringVersion === latestVersion && Array.isArray(prior.scores) && prior.scores.length === 4 && prior.scores.every(value => Number.isFinite(Number(value))));
  const lowerIndex = validScores ? latest.scores.reduce((lowest, value, index, values) => Number(value) < Number(values[lowest]) ? index : lowest, 0) : null;
  const equalScores = validScores && latest.scores.every(value => Number(value) === Number(latest.scores[0]));
  const recentCheckins = [...checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  return <div className="stack" dir={direction}>
    <section className="panel"><div className="section-heading"><div><span className="badge"><Message source="هەر هەنگاوێک هەژمار دەکرێت" /></span><h2><Message source="پێشکەوتنی من" /></h2><p className="muted"><Message source="تۆماری هەوڵ و فێربوونت ببینە. زیادبوونی خولەک بە تەنها بەڵگەی فێربوونی زیاتر نییە." /></p></div><span aria-hidden="true" style={{
          fontSize: '2rem'
        }}>🌿</span></div><div className="progress-metrics" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '1rem'
      }}>{[{
          value: done.length,
          label: 'ئەرکی تەواوکراو'
        }, {
          value: minutes,
          label: 'خولەکی تۆمارکراو'
        }, {
          value: sessions.length,
          label: 'دانیشتنی خوێندن'
        }, {
          value: activeDays,
          label: 'ڕۆژی هەوڵدان'
        }].map(metric => <div className="empty-state" key={metric.label} style={{
          padding: '1rem'
        }}><strong style={{
            display: 'block',
            fontSize: '2rem',
            color: 'var(--accent, #2563eb)'
          }}>{t(metric.value)}</strong><span>{t(metric.label)}</span></div>)}</div><p className="muted"><Message source="خولەکەکان لە کاتژمێری خوێندنەوە تۆمار دەکرێن؛ تەواوکردنی ئەرک خولەک زیاد ناکات. ڕۆژەکان بەبێ مەرجی بەردەوامی هەژمار دەکرێن." /></p>{plan && <div><p><Message source="{p0} {p1} لە {p2} ئەرک تەواو کراوە" values={{
            p0: <strong><Message source="پلانی ئێستا:" /></strong>,
            p1: t(currentDone),
            p2: t(currentTasks.length)
          }} /></p><progress value={currentDone} max={Math.max(1, currentTasks.length)} aria-label={t("پێشکەوتنی پلانی ئێستا")} style={{
          width: '100%',
          accentColor: 'var(--accent, #2563eb)'
        }} /></div>}</section>

    {learningSummary && <section className="panel"><div className="section-heading"><div><span className="badge"><Message source="بەڵگەی ڕاهێنان" /></span><h2><Message source="چی تاقی کردووەتەوە؟" /></h2><p className="muted"><Message source="ئەنجامی ئەم ڕاهێنانانە تەنها هەمان بابەت و پرسیارەکان دەگرێتەوە؛ نمرەی گشتیی توانای تۆ نییە." /></p></div></div><div className="grid-two"><p><Message source="{p0} لە {p1} ڕاهێنانی سەربەخۆ لە هەوڵی یەکەمدا ڕاست بووە." values={{
            p0: <strong>{t(Number(learningSummary.independentCorrect) || 0)}</strong>,
            p1: <strong>{t(Number(learningSummary.independentTotal) || 0)}</strong>
          }} /></p><p><Message source="{p0} بابەت پێداچوونەوەی دواتری بۆ کراوە." values={{
            p0: <strong>{t(Number(learningSummary.followupCompletedTopics) || 0)}</strong>
          }} /></p></div>{learningSummary.comparisons?.length > 0 ? <div className="stack">{learningSummary.comparisons.map(item => <article className="task-row" key={item.topicId}><strong>{t(item.title)}</strong><p><Message source="پشکنینی سەرەتایی: {p0} لە {p1} · پشکنینی دواتر: {p2} لە {p3}" values={{
              p0: t(item.baselineCorrect),
              p1: t(item.total),
              p2: t(item.followupCorrect),
              p3: t(item.total)
            }} /></p><small className="muted"><Message source="ئەمە بەراوردی دوو پشکنینی هەمان بابەتە؛ بە تەنها هۆکاری گۆڕانەکە دیاری ناکات." /></small></article>)}</div> : <p className="empty-state"><Message source="دوای ڕاهێنان، پشکنینی دواتری بابەتەکە جێبەجێ بکە تا هەردوو ئەنجامەکەت ببینیت." /></p>}</section>}

    <section className="panel"><div className="section-heading"><div><h2><Message source="هەوڵەکانی ٧ ڕۆژی ڕابردوو" /></h2><p className="muted"><Message source="دانیشتنە تۆمارکراوەکان و ئەرکە تەواوکراوەکان؛ ڕۆژی بەتاڵ واتای تۆمارنەکراوە." /></p></div></div>{minutes === 0 && done.length === 0 && <p className="empty-state"><Message source="هێشتا هەوڵێک تۆمار نەکراوە. بە ئەرکێکی بچووک یان دانیشتنێکی کورت دەست پێ بکە." /></p>}<div className="stack">{daily.map(day => <div key={day.date} style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(80px, 1fr) minmax(50px, 2fr) minmax(90px, 1fr)',
          alignItems: 'center',
          gap: '.65rem'
        }}><span style={{
            fontSize: '.85rem'
          }}>{t(displayDate(day.date, {
              weekday: 'short'
            }, locale))}{t(day.date === today ? ' · ئەمڕۆ' : '')}</span><div role="img" aria-label={t(`${day.minutes} خولەکی خوێندن تۆمار کراوە`)} style={{
            background: 'var(--surface-soft, #eef2f8)',
            borderRadius: '99px',
            height: '.75rem',
            overflow: 'hidden'
          }}><div style={{
              height: '100%',
              width: `${day.minutes / maxMinutes * 100}%`,
              background: 'var(--accent, #2563eb)',
              borderRadius: '99px'
            }} /></div><span className="muted" style={{
            fontSize: '.8rem'
          }}><Message source="{p0} خولەک · {p1} ئەرک" values={{
              p0: t(day.minutes),
              p1: t(day.tasks)
            }} /></span></div>)}</div></section>

    <section className="panel"><div className="section-heading"><div><h2><Message source="خاڵە بەهێزەکان و پێشینەی پشتیوانی" /></h2><p className="muted"><Message source="ئەم بەشە وەڵامەکانی خۆتە. پێوانەی فێربوون، ڕێژەی نەخۆشی یان دەستنیشانکردن نییە." /></p></div>{onReassess && <button className="btn btn-secondary" type="button" onClick={onReassess}>{t(attempts.length ? 'هەڵسەنگاندن دووبارە بکەرەوە' : 'هەڵسەنگاندن دەست پێ بکە')}</button>}</div>
      {validScores ? <><div className="empty-state" style={{
          textAlign: 'start'
        }}><strong>{t(equalScores ? 'شوێنێک بۆ دەستپێکردن' : `شوێنێک بۆ پشتبەستن: ${studyAreas[lowerIndex]}`)}</strong><p>{t(equalScores ? 'وەڵامەکانت لە هەموو بوارەکان هەمان نیشاندەر پیشان دەدەن. بوارێک هەڵبژێرە و بە هەنگاوێکی بچووک دەست پێ بکە.' : 'بەپێی وەڵامەکانت، ئەم بوارە بە بەراورد لەگەڵ بوارەکانی تر پشتیوانیی کەمتر داوا دەکات. ئەو ڕێگایانەی یارمەتیت دەدەن بۆ بوارەکانی تریش تاقی بکەرەوە.')}</p>{done.length > 0 && <p><Message source="تۆ {p0} ئەرکت تەواو کردووە؛ ئەو ڕێگایانەی یارمەتییان داویت بناسە و دووبارەیان بکەرەوە." values={{
              p0: t(done.length)
            }} /></p>}</div>
        <p className="muted"><Message source="دوا هەڵسەنگاندن: {p0} · {p1}" values={{
            p0: t(displayDate(localDate(latest.date), {}, locale)),
            p1: t(legacyScores ? 'تۆماری یاساکانی هەژمارکردنی وەشانی پێشوو؛ لەگەڵ وەشانی نوێ بەراورد ناکرێت.' : 'نیشاندەری پێشینەی پشتیوانی لە ٠ بۆ ١٠٠؛ ژمارەی زیاتر واتای پێشینەی زیاترە، نە ڕێژەی کێشە.')
          }} /></p>
        {prior && !sameVersion && <p className="muted"><Message source="بەراوردی ژمارەیی پیشان نادرێت چونکە یاسای هەژمارکردنی دوو هەڵسەنگاندنەکە جیاوازە یان وەشانی یەکێکیان دیار نییە." /></p>}
        <div className="stack">{studyAreas.map((area, index) => {
            const score = Math.max(0, Math.min(100, Number(latest.scores[index])));
            const difference = sameVersion ? score - Number(prior.scores[index]) : null;
            return <div key={area}><div className="section-heading" style={{
                marginBottom: '.35rem'
              }}><span>{t(area)}</span><strong>{t(score)} / {t("١٠٠")}</strong></div><progress value={score} max="100" aria-label={t(`${area}: ${score} لە ١٠٠، نیشاندەری خۆهەڵسەنگاندن`)} style={{
                width: '100%',
                accentColor: 'var(--accent, #2563eb)'
              }} />{difference !== null && <small className="muted"><Message source="{p0} · هەمان یاسای هەژمارکردن" values={{
                  p0: t(difference < 0 ? `${Math.abs(difference)} خاڵ کەمتر لە تۆماری پێشوو` : difference > 0 ? `${difference} خاڵ زیاتر لە تۆماری پێشوو` : 'لەگەڵ تۆماری پێشوو یەکسانە')
                }} /></small>}</div>;
          })}</div><p className="muted"><Message source="گۆڕینی نیشاندەرەکە بە تەنها بەڵگەی گۆڕینی فێربوون نییە؛ وەڵام و بارودۆخیش دەگۆڕێن." /></p></> : <div className="empty-state"><p><Message source="بە هەڵسەنگاندنی سەرەتایی دەتوانیت بوارەکانی پشتیوانی هەڵبژێریت. هەوڵە ڕۆژانەکانتیش لێرە تۆمار دەبن." /></p></div>}
    </section>

    <section className="panel"><h2><Message source="تێبینییەکانی من" /></h2><p className="muted"><Message source="ئەوەی سوودی هەبووە دووبارەی بکەرەوە؛ ئەوەی قورس بووە بگۆڕە. تێبینییەکانت خۆکار لەگەڵ کەس هاوبەش ناکرێن." /></p>{recentCheckins.length ? <div className="stack">{recentCheckins.map(checkin => <article className="task-row" key={checkin.id || checkin.date}><div className="section-heading"><strong>{t(displayDate(checkin.date, {
                weekday: 'long'
              }, locale))}</strong><span className="badge">{t(moodLabels[checkin.mood] || 'تێبینی')}</span></div>{checkin.supportReason && <p><strong><Message source="هۆکار:" /></strong> {t(supportReasons.find(reason => reason.id === checkin.supportReason)?.label || checkin.supportReason)}</p>}{checkin.supportAction && <p className="muted"><Message source="هەنگاوی پێشنیارکراو: {p0}" values={{
              p0: t(checkin.supportAction)
            }} /></p>}{checkin.note ? <p style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere'
          }}>{checkin.note}</p> : <p className="muted"><Message source="تێبینییەکی نووسراو زیاد نەکراوە." /></p>}</article>)}</div> : <p className="empty-state"><Message source="لە «پلانی من» بەدواداچوونی ئەمڕۆ تۆمار بکە، تا بزانیت چی یارمەتیت دەدات." /></p>}</section>
  </div>;
}
