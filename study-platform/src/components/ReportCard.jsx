import { translateAnswer } from "../i18n/runtime.js";
import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { sections, questions } from '../data/questions.js';
import { getRecommendations, supportBand, supportReasons, supportRules, SCORING_VERSION } from '../utils/scoring.js';
export default function ReportCard({
  studentName,
  setStudentName,
  scores,
  answers,
  extraTexts,
  handleReset,
  handleDownloadText,
  handleShare,
  onOpenPlan,
  onOpenLearning,
  onEdit
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const chartData = sections.map((s, i) => ({
    name: t(s.title).split(' ').slice(0, 2).join(' '),
    score: scores[i]
  }));
  return <article className="report stack"><section className="panel"><div className="section-heading"><div><span className="eyebrow"><Message source="ڕوونکردنەوە، بەبێ حوکمدان" /></span><h2><Message source="ڕاپۆرتی کۆتایی 🎉" /></h2></div><span className="badge"><Message source="١٦ وەڵام" /></span></div><p className="info-note"><Message source="ئەمانە نیشاندەری پێویستی بە پشتگیرین بەپێی وەڵامەکانت؛ ڕێژەی نەخۆشی، زیرەکی یان نمرەی قوتابخانە نین. عادەتەکان لە ئەنجامی ڕاهێنانی وانە جیاوازن." /></p><label className="print:hidden"><Message source="ناوی قوتابی (ئیختیاری){p0}" values={{
          p0: <input className="input" value={studentName} maxLength={100} onChange={e => setStudentName(e.target.value)} placeholder={t("ناوی قوتابی (ئیختیاری)")} />
        }} /></label><p className="print-only">{studentName || t('بەبێ ناو (نهێنی)')}</p><div className="report-overview"><div className="report-chart" role="img" aria-label={t("هێڵکاری نیشاندەرەکانی پشتگیری")}><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData}><PolarGrid /><PolarAngleAxis dataKey="name" tick={{
                fontSize: 12,
                fill: 'var(--text)'
              }} /><PolarRadiusAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={n => t(n === 0 ? 'کەمتر' : n === 50 ? 'مامناوەند' : 'زیاتر')} tick={{
                fontSize: 10
              }} /><Radar name={t("پێویستی بە پشتگیری")} dataKey="score" stroke="#19715a" fill="#19715a" fillOpacity={0.16} isAnimationActive={false} /><Tooltip formatter={v => t(supportBand(v))} /></RadarChart></ResponsiveContainer></div><div className="score-list">{sections.map((s, i) => <div className="score-card" key={s.id}><h3>{t(s.icon)} {t(s.title)}</h3><strong>{t(supportBand(scores[i]))}</strong><progress value={scores[i]} max="100" aria-label={`${t(s.title)}: ${t(supportBand(scores[i]))}`} /></div>)}</div></div><details className="scoring-details"><summary><Message source="ئەم نیشاندەرانە چۆن دروست دەکرێن؟" /></summary><p><Message source="تەنها وەڵامە ڕاستەوخۆکانی دووبارەبوونەوەی قورسایی و پێویستی بە پشتگیری بە ٠، ١ یان ٢ کورت دەکرێنەوە. ناوەندی هەر بەش لەسەر پێوەرێکی ٠ تا ١٠٠ پیشان دەدرێت بۆ هەڵبژاردنی پێشنیار؛ ئەم پێوەرە پێوانەیەکی پزیشکیی پشتڕاستکراو نییە." /></p><p><Message source="درێژی نووسین، ماوەی خوێندن، ژینگە و شێوازی داواکردنی یارمەتی نمرە نادرێن؛ تەنها بۆ تێگەیشتن لە بارودۆخت بەکاردێن." /></p><p className="muted"><Message source="وەشانی یاسا: {p0}. ئەنجامەکانی یاسای کۆن بە ڕاستەوخۆ لەگەڵ ئەمە بەراورد ناکرێن." values={{
            p0: t(SCORING_VERSION)
          }} /></p></details><div className="action-row print:hidden"><button className="btn btn-primary" onClick={onOpenLearning}><Message source="تێگەیشتن لە وانەش بپشکنە ←" /></button><button className="btn btn-secondary" onClick={onOpenPlan}><Message source="پلانی کەسی ئامادە بکە" /></button><button className="btn btn-secondary" onClick={onEdit}><Message source="پێداچوونەوە بە وەڵامەکان" /></button></div></section>
 <div className="grid-two">{sections.map((s, i) => {
        const reasons = supportReasons(answers, s.id),
          count = questions.filter(q => q.section === s.id && supportRules[q.id]).length;
        return <section className="panel recommendation-card" key={s.id}><span className="badge">{t(supportBand(scores[i]))}</span><h3>{t(s.icon)} {t(s.title)}</h3><h4><Message source="بۆچی ئەم پێشنیارانە؟" /></h4>{reasons.length ? <ul className="reason-list">{reasons.map((r, j) => <li key={j}><span>{t(r.question)}</span><strong>{t(r.answer)}</strong></li>)}</ul> : <p className="muted"><Message source="لە وەڵامە ڕاستەوخۆکانی ئەم بەشەدا قورساییەکی زۆرت ڕاپۆرت نەکردووە؛ دەتوانیت عادەتە بەسوودەکانت بەردەوام بکەیت." /></p>}<small className="muted"><Message source="نیشاندەرەکە لە {p0} پرسیاری ڕاستەوخۆی ئەم بەشەوە هاتووە." values={{
              p0: t(count)
            }} /></small><ul>{getRecommendations(i, scores[i]).map((rec, j) => <li key={j}>{t(rec)}</li>)}</ul></section>;
      })}</div>
 <section className="panel answer-summary"><h2><Message source="پوختەی وەڵامەکان" /></h2>{sections.map(s => <div className="answer-section" key={s.id}><h3>{t(s.icon)} {t(s.title)}</h3><div className="grid-two">{questions.filter(q => q.section === s.id).map(q => <div className="answer-item" key={q.id}><p>{t(q.text)}</p><strong>{translateAnswer(q, answers[q.id] || '—', locale)}</strong>{extraTexts[q.id + '_extra'] && <p><Message source="تێبینی: {p0}" values={{
                p0: extraTexts[q.id + '_extra']
              }} /></p>}</div>)}</div></div>)}</section><section className="encouragement"><h2><Message source="هەنگاوێکی بچووکیش پێشکەوتنە 🌱" /></h2><p><Message source="ڕێگایەک هەڵبژێرە، تاقی بکەرەوە و بەپێی ئەنجامەکان بیگۆڕە." /></p></section><div className="action-row print:hidden"><button className="btn btn-primary" onClick={() => window.print()}><Message source="🖨 چاپ / پاشەکەوت وەک PDF" /></button><button className="btn btn-secondary" onClick={handleDownloadText}><Message source="📄 داگرتن وەک دەق" /></button><button className="btn btn-secondary" onClick={handleShare}><Message source="🔗 هاوبەشکردن" /></button><button className="btn btn-secondary" onClick={handleReset}><Message source="🔄 فۆڕمێکی نوێ" /></button></div></article>;
}
