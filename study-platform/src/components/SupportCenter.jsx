import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { useEffect, useState } from 'react';
import { localDate } from '../utils/planning.js';
const options = [['understanding', 'لە بابەتەکە تێناگەم', 'بگەڕێوە بۆ بنەمای بابەتەکە؛ نموونەیەکی چارەسەرکراو ببینە و تەنها یەک پرسیاری هاوشێوە تاقی بکەرەوە.'], ['starting', 'نازانم لە کوێ دەست پێ بکەم', 'هەنگاوەکە بکە بچووک: کتێبەکە بکەرەوە، یەک پرسیار هەڵبژێرە و تەنها هەنگاوی یەکەمی بنووسە.'], ['time', 'کاتم کەمە', 'یەک ئەرکی گرنگ هەڵبژێرە و کاتێکی ڕاستەقینەی بۆ دابنێ. دەتوانیت لە پلاندا کات و ژمارەی ئەرکەکان بگۆڕیت.'], ['environment', 'شوێنەکەم ژاوەژاوە', 'کاتێکی کەمتر ژاوەژاو هەڵبژێرە. ئەگەر دەکرێت لە دەوروبەرت داوا بکە ماوەیەکی کورت بۆت بهێڵنەوە؛ ژووری تایبەت مەرج نییە.'], ['tired', 'ماندووم یان فشارم هەیە', 'دەتوانیت پشوو بدەیت و ئەرکەکە کورتتر بکەیت. ئەگەر فشارەکە بەردەوامە و ڕۆژانەت تێک دەدات، لەگەڵ کەسێکی متمانەپێکراو یان ڕاوێژکار قسە بکە.']];
export default function SupportCenter({
  studentName,
  feedback,
  setFeedback,
  onOpenLearning,
  onOpenPlan,
  onDownload
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const [reason, setReason] = useState('understanding'),
    [recipient, setRecipient] = useState('مامۆستا'),
    [note, setNote] = useState(''),
    [includeName, setIncludeName] = useState(false),
    [message, setMessage] = useState('');
  const [calm, setCalm] = useState(false),
    [seconds, setSeconds] = useState(60),
    [useful, setUseful] = useState('3'),
    [feedbackReason, setFeedbackReason] = useState(''),
    [consent, setConsent] = useState(false);
  const selected = options.find(o => o[0] === reason);
  const draft = t('سڵاو {p0}،\n{p1}لە خوێندندا پێویستم بە کەمێک یارمەتی هەیە: {p2}.\n{p3}دەتوانین کاتێک دیاری بکەین بۆ قسەکردن و هەڵبژاردنی هەنگاوێکی گونجاو؟', {
    p0: t(recipient),
    p1: includeName && studentName ? t('من {p0}م.\n', {
      p0: studentName
    }) : '',
    p2: t(selected[1]),
    p3: note.trim() ? note.trim() + '\n' : ''
  });
  useEffect(() => {
    if (!calm) return;
    const end = Date.now() + 60000;
    setSeconds(60);
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSeconds(left);
      if (!left) setCalm(false);
    }, 500);
    return () => clearInterval(t);
  }, [calm]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage('دەقەکە کۆپی کرا؛ خۆت دەتوانیت بۆ کەسی هەڵبژێردراو بینێریت.');
    } catch {
      onDownload('hawre-support.txt', draft);
      setMessage('دەقەکە وەک فایل ئامادە کرا.');
    }
  }
  function saveFeedback(e) {
    e.preventDefault();
    if (!consent) return;
    setFeedback(prev => [...prev, {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      date: localDate(),
      useful: Number(useful),
      reason: feedbackReason,
      note: ''
    }].slice(-200));
    setConsent(false);
    setMessage('تێبینییەکەت تەنها لەم وێبگەڕە پاشەکەوت کرا.');
  }
  return <div className="stack"><section className="panel"><div className="section-heading"><h2><Message source="ئێستا کامەیان نزیکترە لە بارودۆخت؟" /></h2><span className="badge"><Message source="بەبێ حوکمدان" /></span></div><fieldset className="choice-fieldset"><legend className="sr-only"><Message source="هۆکاری داواکردنی پشتگیری" /></legend><div className="choice-grid">{options.map(([key, label]) => <label className={`choice-option ${reason === key ? 'selected' : ''}`} key={key}><input type="radio" name="support-reason" value={key} checked={reason === key} onChange={() => setReason(key)} />{t(label)}</label>)}</div></fieldset><div className="support-action"><h3><Message source="هەنگاوێکی گونجاو" /></h3><p>{t(selected[2])}</p><div className="action-row">{reason === 'understanding' ? <button className="btn btn-primary" onClick={onOpenLearning}><Message source="نموونە و ڕاهێنان ببینە" /></button> : <button className="btn btn-primary" onClick={onOpenPlan}><Message source="پلانی خۆم ڕێک بخەم" /></button>}</div></div></section>
 <section className="panel"><div className="section-heading"><h2><Message source="یەک خولەک پشوو بۆ خۆت" /></h2><span className="badge"><Message source="ئارەزوومەندانە" /></span></div><p><Message source="ئەگەر گونجاوە، دانیشە و سەرنج بدە بە هەناسەی ئاساییت. پێویست ناکات هەناسەت ڕابگریت یان بە زۆر قووڵی بکەیت. ئەگەر ناخۆش بوو بوەستە." /></p><div className={`calm-space ${calm ? 'active' : ''}`}><span aria-hidden="true">🌿</span><strong>{t(calm ? `${seconds} چرکە` : 'بە ئارامی، بە خێرایی خۆت')}</strong></div><button className="btn btn-secondary" onClick={() => {
        setCalm(v => !v);
        setSeconds(60);
      }}>{t(calm ? 'وەستاندنی ڕاهێنان' : 'دەستپێکردنی پشووی یەک خولەک')}</button><p className="muted"><Message source="ئەم بەشە پشتگیرییەکی گشتییە؛ نە چارەسەری نەخۆشی یان جێگرەوەی ڕاوێژکاری پسپۆڕ." /></p></section>
 <section className="panel"><h2><Message source="داواکردنی یارمەتی لە کەسێکی متمانەپێکراو" /></h2><p className="info-note"><Message source="هیچ کەسێک ئەم بەشە چاودێری ناکات و نامەکە خۆکار نانێردرێت. دەتوانیت دەقێک ئامادە بکەیت، بگۆڕیت و خۆت هاوبەشی بکەیت." /></p><label><Message source="بۆ کێ؟{p0}" values={{
          p0: <select className="input" value={recipient} onChange={e => setRecipient(e.target.value)}><option value="مامۆستا"><Message source="مامۆستا" /></option><option value="ڕاوێژکار"><Message source="ڕاوێژکار" /></option><option value="کەسێکی متمانەپێکراو"><Message source="کەسێکی متمانەپێکراو" /></option></select>
        }} /></label><label><Message source="چی دەتەوێت زیاد بکەیت؟ (ئارەزوومەندانە){p0}" values={{
          p0: <textarea className="input" value={note} onChange={e => setNote(e.target.value)} maxLength={1500} rows={3} />
        }} /></label><label className="check-label"><Message source="{p0}ناوم لە دەقەکەدا بێت" values={{
          p0: <input type="checkbox" checked={includeName} onChange={e => setIncludeName(e.target.checked)} />
        }} /></label><pre className="share-preview">{draft}</pre><div className="action-row"><button className="btn btn-primary" onClick={copy}><Message source="کۆپیکردنی داواکاری" /></button><button className="btn btn-secondary" onClick={() => onDownload('hawre-support.txt', draft)}><Message source="داگرتنی داواکاری وەک دەق" /></button></div></section>
 <section className="panel"><h2><Message source="یارمەتیمان بدە خزمەتەکە باشتر بکەین" /></h2><p><Message source="ئەم تێبینییە ئارەزوومەندانەیە. تەنها لەم ئامێرەدا دەپارێزرێت و بە پاشەکەوتەکەت دەتوانیت خۆت بیگوازیتەوە. ئەمە تۆمارکردنی تێبینییە؛ بەڵگەی توێژینەوەی ئەنجامدراو نییە." /></p><form onSubmit={saveFeedback} className="stack"><label><Message source="تا ئێستا پلاتفۆرمەکە چەند بەسوود بووە؟{p0}" values={{
            p0: <select className="input" value={useful} onChange={e => setUseful(e.target.value)}><option value="1"><Message source="١ — سوودی کەم بوو" /></option><option value="2">{t("٢")}</option><option value="3"><Message source="٣ — مامناوەند" /></option><option value="4">{t("٤")}</option><option value="5"><Message source="٥ — سوودی زۆر بوو" /></option></select>
          }} /></label><label><Message source="چی یارمەتیدا یان بووە ڕێگر؟{p0}" values={{
            p0: <textarea className="input" value={feedbackReason} maxLength={120} onChange={e => setFeedbackReason(e.target.value)} rows={2} />
          }} /></label><label className="check-label"><Message source="{p0}ڕازیم ئەم تێبینییە لە زانیارییەکانی خۆمدا پاشەکەوت بکرێت" values={{
            p0: <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          }} /></label><button className="btn btn-primary" disabled={!consent}><Message source="پاشەکەوتکردنی تێبینی" /></button></form><p className="muted"><Message source="{p0} تێبینیی تۆمارکراو" values={{
          p0: t(feedback.length)
        }} /></p></section><p role="status">{t(message)}</p></div>;
}
