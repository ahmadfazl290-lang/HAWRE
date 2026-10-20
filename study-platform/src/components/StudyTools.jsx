import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { localizedField } from '../utils/authoredText.js';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { addReviewDays, isReviewDue, localReviewDate, reviewCard, sortCardsForReview } from '../utils/reviewSchedule.js';
const DAYS = [['saturday', 'شەممە'], ['sunday', 'یەکشەممە'], ['monday', 'دووشەممە'], ['tuesday', 'سێشەممە'], ['wednesday', 'چوارشەممە'], ['thursday', 'پێنجشەممە'], ['friday', 'هەینی']];
const makeId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const subjectFor = profile => typeof profile?.subject === 'string' ? profile.subject : typeof profile?.subjects?.[0] === 'string' ? profile.subjects[0] : '';
const minutesFor = (value, fallback = 25) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.min(180, Math.max(1, Math.round(Number(value)))) : fallback;
const clock = milliseconds => {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const array = value => Array.isArray(value) ? value : [];
export default function StudyTools({
  profile,
  sessions = [],
  setSessions,
  tools = {},
  setTools
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const ids = useId();
  const today = localReviewDate();
  const flashcards = array(tools.flashcards);
  const mistakes = array(tools.mistakes);
  const timetable = array(tools.timetable);
  const defaultSubject = localizedField(profile, 'subject', t) || subjectFor(profile);
  const [focusMinutes, setFocusMinutes] = useState(() => minutesFor(profile?.dailyMinutes));
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerSubject, setTimerSubject] = useState(defaultSubject);
  const [phase, setPhase] = useState('study');
  const [remainingMs, setRemainingMs] = useState(() => minutesFor(profile?.dailyMinutes) * 60_000);
  const [running, setRunning] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');
  const runRef = useRef(null);
  const finishRun = useCallback(run => {
    if (runRef.current !== run || run.completed) return;
    run.completed = true;
    run.running = false;
    runRef.current = null;
    setRemainingMs(0);
    setRunning(false);
    if (run.phase === 'study') {
      const entry = {
        id: run.id,
        date: localReviewDate(new Date(run.deadline)),
        minutes: run.minutes,
        subject: run.subject
      };
      setSessions(previous => array(previous).some(item => item.id === entry.id) ? previous : [...array(previous), entry]);
      setTimerMessage('خوێندنەکەت تەواو بوو و تۆمار کرا. ئێستا پشوویەکی کورت بدە.');
    } else setTimerMessage('پشوو تەواو بوو. کاتێک ئامادە بوویت، خوێندن دەست پێ بکەرەوە.');
  }, [setSessions]);
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const run = runRef.current;
      if (!run?.running || run.completed) return;
      const next = Math.max(0, run.deadline - Date.now());
      setRemainingMs(next);
      if (!next) finishRun(run);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running, finishRun]);
  function startTimer() {
    let run = runRef.current;
    if (!run) {
      const minutes = phase === 'study' ? focusMinutes : breakMinutes;
      run = {
        id: makeId('session'),
        phase,
        minutes,
        subject: timerSubject.trim() || 'خوێندنی گشتی',
        remaining: minutes * 60_000,
        completed: false
      };
      runRef.current = run;
    }
    if (run.running || run.completed) return;
    run.running = true;
    run.deadline = Date.now() + run.remaining;
    setRemainingMs(run.remaining);
    setTimerMessage('');
    setRunning(true);
  }
  function pauseTimer() {
    const run = runRef.current;
    if (!run?.running) return;
    const next = Math.max(0, run.deadline - Date.now());
    if (!next) {
      finishRun(run);
      return;
    }
    run.remaining = next;
    run.running = false;
    setRemainingMs(next);
    setRunning(false);
    setTimerMessage('کاتژمێر وەستێنراوە؛ دەتوانیت لە هەمان شوێنەوە بەردەوام بیت.');
  }
  function resetTimer(nextPhase = phase) {
    runRef.current = null;
    setRunning(false);
    setPhase(nextPhase);
    setRemainingMs((nextPhase === 'study' ? focusMinutes : breakMinutes) * 60_000);
    setTimerMessage('');
  }
  function changeMinutes(value, target) {
    const minutes = minutesFor(value, 1);
    if (target === 'study') setFocusMinutes(minutes);else setBreakMinutes(minutes);
    if (phase === target && !runRef.current) setRemainingMs(minutes * 60_000);
  }
  const timerHasRun = Boolean(runRef.current);
  const todayMinutes = array(sessions).filter(entry => entry.date === today).reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
  const [scheduleDay, setScheduleDay] = useState('saturday');
  const [scheduleSubject, setScheduleSubject] = useState(defaultSubject);
  const [scheduleTime, setScheduleTime] = useState('16:00');
  const [scheduleEditId, setScheduleEditId] = useState(null);
  const [scheduleMessage, setScheduleMessage] = useState('');
  function clearSchedule() {
    setScheduleEditId(null);
    setScheduleSubject('');
    setScheduleTime('16:00');
  }
  function saveSchedule(event) {
    event.preventDefault();
    if (!scheduleSubject.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) return;
    const item = {
      id: scheduleEditId || makeId('schedule'),
      day: scheduleDay,
      subject: scheduleSubject.trim(),
      time: scheduleTime
    };
    setTools(previous => ({
      ...previous,
      timetable: scheduleEditId ? array(previous?.timetable).map(entry => entry.id === scheduleEditId ? {
        ...entry,
        ...item
      } : entry) : [...array(previous?.timetable), item]
    }));
    setScheduleMessage(scheduleEditId ? 'خشتەکە نوێ کرایەوە.' : 'کاتی خوێندن زیاد کرا.');
    clearSchedule();
  }
  function editSchedule(entry) {
    setScheduleEditId(entry.id);
    setScheduleDay(entry.day);
    setScheduleSubject(entry.subject);
    setScheduleTime(entry.time);
    document.getElementById(`${ids}-schedule-subject`)?.focus();
  }
  function deleteSchedule(id) {
    setTools(previous => ({
      ...previous,
      timetable: array(previous?.timetable).filter(entry => entry.id !== id)
    }));
    if (scheduleEditId === id) clearSchedule();
    setScheduleMessage('کاتی خوێندن سڕایەوە.');
  }
  const sortedTimetable = [...timetable].sort((first, second) => DAYS.findIndex(([day]) => day === first.day) - DAYS.findIndex(([day]) => day === second.day) || String(first.time).localeCompare(String(second.time)));
  const [cardQuestion, setCardQuestion] = useState('');
  const [cardAnswer, setCardAnswer] = useState('');
  const [cardSubject, setCardSubject] = useState(defaultSubject);
  const [cardEditId, setCardEditId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [recallAttempt, setRecallAttempt] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const orderedCards = sortCardsForReview(flashcards, today);
  const cardIndex = Math.max(0, orderedCards.findIndex(entry => entry.id === selectedCardId));
  const currentCard = orderedCards[cardIndex];
  const dueCount = flashcards.filter(entry => isReviewDue(entry.dueDate, today)).length;
  useEffect(() => {
    setCardRevealed(false);
    setRecallAttempt('');
  }, [currentCard?.id, currentCard?.answer]);
  function clearCard() {
    setCardEditId(null);
    setCardQuestion('');
    setCardAnswer('');
  }
  function saveCard(event) {
    event.preventDefault();
    if (!cardQuestion.trim() || !cardAnswer.trim()) return;
    const item = {
      id: cardEditId || makeId('card'),
      question: cardQuestion.trim(),
      answer: cardAnswer.trim(),
      subject: cardSubject.trim()
    };
    setTools(previous => ({
      ...previous,
      flashcards: cardEditId ? array(previous?.flashcards).map(entry => entry.id === cardEditId ? {
        ...entry,
        ...item,
        dueDate: today,
        intervalDays: 0,
        status: 'review'
      } : entry) : [...array(previous?.flashcards), {
        ...item,
        status: 'review',
        createdAt: new Date().toISOString(),
        dueDate: today,
        intervalDays: 0,
        attempts: 0,
        lastReviewed: ''
      }]
    }));
    setSelectedCardId(item.id);
    setCardRevealed(false);
    setRecallAttempt('');
    setCardMessage(cardEditId ? 'کارتەکە نوێ کرایەوە و بۆ پێداچوونەوەی ئەمڕۆ دانرا.' : 'کارتەکە زیاد کرا. سەرەتا بەبێ سەیرکردن وەڵام بدەرەوە.');
    clearCard();
  }
  function editCard(entry) {
    setCardEditId(entry.id);
    setCardQuestion(entry.question);
    setCardAnswer(entry.answer);
    setCardSubject(entry.subject || '');
    document.getElementById(`${ids}-card-question`)?.focus();
  }
  function gradeCard(grade) {
    if (!currentCard || !cardRevealed) return;
    const reviewed = reviewCard(currentCard, grade, today);
    setTools(previous => ({
      ...previous,
      flashcards: array(previous?.flashcards).map(entry => entry.id === currentCard.id ? reviewCard(entry, grade, today) : entry)
    }));
    setSelectedCardId(null);
    setCardRevealed(false);
    setRecallAttempt('');
    setCardMessage(grade === 'known' ? `بەپێی هەڵسەنگاندنی خۆت، پێداچوونەوەی داهاتوو بۆ ${reviewed.dueDate} دانرا.` : 'ئەم کارتەت بۆ پێداچوونەوەی ئەمڕۆ نیشان کرد.');
  }
  function moveCard(direction) {
    if (!orderedCards.length) return;
    setSelectedCardId(orderedCards[(cardIndex + direction + orderedCards.length) % orderedCards.length].id);
    setCardRevealed(false);
    setRecallAttempt('');
  }
  function deleteCard(id) {
    setTools(previous => ({
      ...previous,
      flashcards: array(previous?.flashcards).filter(entry => entry.id !== id)
    }));
    setSelectedCardId(null);
    setCardRevealed(false);
    if (cardEditId === id) clearCard();
    setCardMessage('کارتەکە سڕایەوە.');
  }
  const [mistakeSubject, setMistakeSubject] = useState(defaultSubject);
  const [mistakeQuestion, setMistakeQuestion] = useState('');
  const [mistakeCorrection, setMistakeCorrection] = useState('');
  const [mistakeEditId, setMistakeEditId] = useState(null);
  const [mistakeMessage, setMistakeMessage] = useState('');
  const [reattemptDrafts, setReattemptDrafts] = useState({});
  const [revealedMistakes, setRevealedMistakes] = useState({});
  function clearMistake() {
    setMistakeEditId(null);
    setMistakeQuestion('');
    setMistakeCorrection('');
  }
  function saveMistake(event) {
    event.preventDefault();
    if (!mistakeSubject.trim() || !mistakeQuestion.trim() || !mistakeCorrection.trim()) return;
    const item = {
      id: mistakeEditId || makeId('mistake'),
      subject: mistakeSubject.trim(),
      question: mistakeQuestion.trim(),
      correction: mistakeCorrection.trim(),
      nextReviewDate: today,
      resolved: false
    };
    setTools(previous => ({
      ...previous,
      mistakes: mistakeEditId ? array(previous?.mistakes).map(entry => entry.id === mistakeEditId ? {
        ...entry,
        ...item
      } : entry) : [...array(previous?.mistakes), {
        ...item,
        createdAt: new Date().toISOString(),
        reattempts: 0,
        lastReattempt: '',
        reattemptExplanation: ''
      }]
    }));
    setMistakeMessage(mistakeEditId ? 'تۆمارەکە نوێ کرایەوە.' : 'هەڵەکە و ڕێگای ڕاستکردنەوەکەی تۆمار کران.');
    clearMistake();
  }
  function editMistake(entry) {
    setMistakeEditId(entry.id);
    setMistakeSubject(entry.subject);
    setMistakeQuestion(entry.question);
    setMistakeCorrection(entry.correction);
    document.getElementById(`${ids}-mistake-question`)?.focus();
  }
  function deleteMistake(id) {
    setTools(previous => ({
      ...previous,
      mistakes: array(previous?.mistakes).filter(entry => entry.id !== id)
    }));
    if (mistakeEditId === id) clearMistake();
    setMistakeMessage('تۆمارەکە سڕایەوە.');
  }
  function logReattempt(entry, resolved) {
    const explanation = (reattemptDrafts[entry.id] || '').trim();
    if (!explanation || !revealedMistakes[entry.id]) return;
    setTools(previous => ({
      ...previous,
      mistakes: array(previous?.mistakes).map(item => item.id === entry.id ? {
        ...item,
        resolved,
        reattemptExplanation: explanation,
        reattempts: Math.min(1_000_000, Math.max(0, Math.floor(Number(item.reattempts) || 0)) + 1),
        lastReattempt: today,
        nextReviewDate: addReviewDays(today, resolved ? 3 : 0)
      } : item)
    }));
    setReattemptDrafts(previous => ({
      ...previous,
      [entry.id]: ''
    }));
    setRevealedMistakes(previous => ({
      ...previous,
      [entry.id]: false
    }));
    setMistakeMessage(resolved ? 'هەوڵەکەت تۆمار کرا؛ سێ ڕۆژی تر دووبارەی بکەرەوە. ئەمە هەڵسەنگاندنی خۆتە.' : 'هەوڵەکەت تۆمار کرا؛ ئەمڕۆ دووبارە پێداچوونەوەی بۆ بکە.');
  }
  const sortedMistakes = [...mistakes].sort((a, b) => Number(isReviewDue(b.nextReviewDate, today)) - Number(isReviewDue(a.nextReviewDate, today)) || String(a.nextReviewDate || '').localeCompare(String(b.nextReviewDate || '')));
  return <div className="stack study-tools" dir={direction}>
    <section className="panel stack" aria-labelledby={`${ids}-timer-title`}>
      <div><h2 className="section-heading" id={`${ids}-timer-title`}><Message source="کاتی خوێندن و پشوو" /></h2><p className="muted"><Message source="ئەرکێکی بچووک هەڵبژێرە. تەنها خولی خوێندنی تەواوکراو لە پێشکەوتنەکەت تۆمار دەکرێت." /></p></div>
      <div className="tool-actions" role="group" aria-label={t("جۆری کاتژمێر")}>{[['study', 'خوێندن'], ['break', 'پشوو']].map(([value, label]) => <button type="button" key={value} className={`btn ${phase === value ? 'btn-primary' : 'btn-secondary'}`} disabled={timerHasRun} aria-pressed={phase === value} onClick={() => resetTimer(value)}>{t(label)}</button>)}</div>
      <div className="grid-two">
        <label className="stack" htmlFor={`${ids}-focus-minutes`}><Message source="کاتی خوێندن بە خولەک{p0}" values={{
            p0: <input className="input" id={`${ids}-focus-minutes`} type="number" min="1" max="180" value={focusMinutes} disabled={timerHasRun} onChange={event => changeMinutes(event.target.value, 'study')} />
          }} /></label>
        <label className="stack" htmlFor={`${ids}-break-minutes`}><Message source="کاتی پشوو بە خولەک{p0}" values={{
            p0: <input className="input" id={`${ids}-break-minutes`} type="number" min="1" max="180" value={breakMinutes} disabled={timerHasRun} onChange={event => changeMinutes(event.target.value, 'break')} />
          }} /></label>
      </div>
      <label className="stack" htmlFor={`${ids}-timer-subject`}><Message source="وانە یان ئەرکی ئەم خولە{p0}" values={{
          p0: <input className="input" id={`${ids}-timer-subject`} value={timerSubject} maxLength="160" disabled={timerHasRun} onChange={event => setTimerSubject(event.target.value)} placeholder={t("بۆ نموونە: چارەسەرکردنی سێ پرسیاری بیرکاری")} />
        }} /></label>
      <output className="focus-clock" role="timer" aria-live="off" aria-label={t("کاتی ماوە")} dir="ltr">{t(clock(remainingMs))}</output>
      <div className="tool-actions">{running ? <button type="button" className="btn btn-primary" onClick={pauseTimer}><Message source="وەستاندنی کاتی" /></button> : <button type="button" className="btn btn-primary" onClick={startTimer}>{t(timerHasRun ? 'بەردەوامبوون' : 'دەستپێکردن')}</button>}<button type="button" className="btn btn-secondary" onClick={() => resetTimer()}><Message source="لە سەرەتاوە" /></button>{!timerHasRun && remainingMs === 0 && <button type="button" className="btn btn-secondary" onClick={() => resetTimer(phase === 'study' ? 'break' : 'study')}>{t(phase === 'study' ? 'ئامادەکردنی پشوو' : 'ئامادەکردنی خوێندن')}</button>}</div>
      <p className="muted"><Message source="ئەمڕۆ: {p0} خولەکی تەواوکراو. ئەگەر ئەم بەشە جێبهێڵیت یان پەڕەکە دابخەیت، کاتژمێری ناتەواو هەڵناگیرێت." values={{
          p0: t(todayMinutes)
        }} /></p><p className="muted" role="status">{t(timerMessage)}</p>
    </section>

    <section className="panel stack" aria-labelledby={`${ids}-schedule-title`}>
      <div><h2 className="section-heading" id={`${ids}-schedule-title`}><Message source="خشتەی هەفتانەی من" /></h2><p className="muted"><Message source="کاتێکی گونجاو بۆ خۆت دیاری بکە؛ هەر ڕۆژێک دەتوانێت چەند کاتێکی هەبێت." /></p></div>
      <form className="stack" onSubmit={saveSchedule}><div className="grid-two">
        <label className="stack" htmlFor={`${ids}-schedule-day`}><Message source="ڕۆژ{p0}" values={{
              p0: <select className="input" id={`${ids}-schedule-day`} value={scheduleDay} onChange={event => setScheduleDay(event.target.value)}>{DAYS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
            }} /></label>
        <label className="stack" htmlFor={`${ids}-schedule-time`}><Message source="کاتی دەستپێکردن{p0}" values={{
              p0: <input className="input" id={`${ids}-schedule-time`} type="time" required value={scheduleTime} onChange={event => setScheduleTime(event.target.value)} />
            }} /></label>
      </div><label className="stack" htmlFor={`${ids}-schedule-subject`}><Message source="وانە یان ئەرک{p0}" values={{
            p0: <input className="input" id={`${ids}-schedule-subject`} required maxLength="200" value={scheduleSubject} onChange={event => setScheduleSubject(event.target.value)} />
          }} /></label>
        <div className="tool-actions"><button className="btn btn-primary" type="submit" disabled={!scheduleSubject.trim() || !scheduleTime}>{t(scheduleEditId ? 'هەڵگرتنی گۆڕانکاری' : 'زیادکردن بۆ خشتە')}</button>{scheduleEditId && <button className="btn btn-secondary" type="button" onClick={clearSchedule}><Message source="پاشگەزبوونەوە" /></button>}</div>
      </form><p className="muted" role="status">{t(scheduleMessage)}</p>
      {sortedTimetable.length ? <ul className="tool-list stack">{sortedTimetable.map(entry => <li className="tool-entry" key={entry.id}><div><strong>{t(DAYS.find(([day]) => day === entry.day)?.[1] || entry.day)}</strong> · <time dir="ltr">{t(entry.time)}</time><p className="tool-text">{entry.subject}</p></div><div className="tool-actions"><button type="button" className="btn btn-secondary" aria-label={t(`دەستکاریکردنی ${entry.subject}`)} onClick={() => editSchedule(entry)}><Message source="دەستکاری" /></button><button type="button" className="btn btn-secondary" aria-label={t(`سڕینەوەی ${entry.subject} لە خشتە`)} onClick={() => deleteSchedule(entry.id)}><Message source="سڕینەوە" /></button></div></li>)}</ul> : <p className="empty-state"><Message source="هێشتا کاتێکت زیاد نەکردووە. بە یەک کاتی بچووک دەست پێ بکە." /></p>}
    </section>

    <section className="panel stack" aria-labelledby={`${ids}-cards-title`}>
      <div><h2 className="section-heading" id={`${ids}-cards-title`}><Message source="کارتەکانی پرسیار و وەڵام" /></h2><p className="muted"><Message source="سەرەتا بەبێ سەیرکردنی وەڵام، بیر بکەرەوە و وەڵامەکەت بنووسە. پاشان بە وەڵامی خۆت بەراوردی بکە." /></p></div>
      <p className="badge"><Message source="{p0} کارت بۆ پێداچوونەوەی ئەمڕۆ · {p1} کارت بە گشتی" values={{
          p0: t(dueCount),
          p1: t(flashcards.length)
        }} /></p>
      <p className="muted"><Message source="کارتە کاتی هاتووەکان سەرەتا پیشان دەدرێن. ئەگەر «لەبیرم بوو» هەڵبژێریت، ماوەکە بە ڕێسایەکی سادە دەبێتە ١، ٣، ٧، ١٤ و ٣٠ ڕۆژ. ئەمە هەڵسەنگاندنی خۆتە و پێوانەیەکی دڵنیای فێربوون نییە." /></p>
      <form className="stack" onSubmit={saveCard}>
        <label className="stack" htmlFor={`${ids}-card-subject`}><Message source="وانە (ئارەزوومەندانە){p0}" values={{
            p0: <input className="input" id={`${ids}-card-subject`} maxLength="120" value={cardSubject} onChange={event => setCardSubject(event.target.value)} />
          }} /></label>
        <div className="grid-two"><label className="stack" htmlFor={`${ids}-card-question`}><Message source="پرسیار{p0}" values={{
              p0: <textarea className="input" id={`${ids}-card-question`} required rows="3" maxLength="3000" value={cardQuestion} onChange={event => setCardQuestion(event.target.value)} />
            }} /></label><label className="stack" htmlFor={`${ids}-card-answer`}><Message source="وەڵامی ڕاست{p0}" values={{
              p0: <textarea className="input" id={`${ids}-card-answer`} required rows="3" maxLength="5000" value={cardAnswer} onChange={event => setCardAnswer(event.target.value)} />
            }} /></label></div>
        <div className="tool-actions"><button type="submit" className="btn btn-primary" disabled={!cardQuestion.trim() || !cardAnswer.trim()}>{t(cardEditId ? 'هەڵگرتنی گۆڕانکاری' : 'زیادکردنی کارت')}</button>{cardEditId && <button type="button" className="btn btn-secondary" onClick={clearCard}><Message source="پاشگەزبوونەوە" /></button>}</div>
      </form><p className="muted" role="status">{t(cardMessage)}</p>
      {currentCard ? <div className="study-card stack">
        <div className="tool-actions"><span className="badge"><Message source="کارت {p0} لە {p1}" values={{
              p0: t(cardIndex + 1),
              p1: t(orderedCards.length)
            }} /></span><span className="badge">{t(isReviewDue(currentCard.dueDate, today) ? 'کاتی پێداچوونەوە هاتووە' : `پێداچوونەوە: ${currentCard.dueDate}`)}</span>{currentCard.subject && <span className="muted">{currentCard.subject}</span>}</div>
        <p className="tool-text"><strong>{currentCard.question}</strong></p>
        <label className="stack" htmlFor={`${ids}-recall`}><Message source="وەڵامەکە بە یاد بهێنەرەوە و هەوڵەکەت بنووسە{p0}" values={{
            p0: <textarea className="input" id={`${ids}-recall`} rows="2" maxLength="5000" value={recallAttempt} onChange={event => setRecallAttempt(event.target.value)} placeholder={t("ئەگەر لەبیرت نییە، ئەوەش بنووسە و پاشان وەڵامەکە ببینە.")} />
          }} /></label>
        <button type="button" className="btn btn-secondary" disabled={!recallAttempt.trim()} aria-expanded={cardRevealed} aria-controls={`${ids}-card-answer-display`} onClick={() => setCardRevealed(value => !value)}>{t(cardRevealed ? 'شاردنەوەی وەڵام' : 'پیشاندانی وەڵام')}</button>
        <div id={`${ids}-card-answer-display`} hidden={!cardRevealed}><p className="tool-text">{currentCard.answer}</p></div>
        <div className="tool-actions"><button type="button" className="btn btn-primary" disabled={!cardRevealed} onClick={() => gradeCard('known')}><Message source="لەبیرم بوو" /></button><button type="button" className="btn btn-secondary" disabled={!cardRevealed} onClick={() => gradeCard('review')}><Message source="دووبارەی دەکەمەوە" /></button><button type="button" className="btn btn-secondary" onClick={() => editCard(currentCard)}><Message source="دەستکاری" /></button><button type="button" className="btn btn-secondary" onClick={() => deleteCard(currentCard.id)}><Message source="سڕینەوەی کارت" /></button></div>
        <div className="tool-actions" aria-label={t("گواستنەوە لە نێوان کارتەکان")}><button type="button" className="btn btn-secondary" disabled={orderedCards.length < 2} onClick={() => moveCard(-1)}><Message source="کارتی پێشوو" /></button><button type="button" className="btn btn-secondary" disabled={orderedCards.length < 2} onClick={() => moveCard(1)}><Message source="کارتی دواتر" /></button></div>
        <p className="muted"><Message source="ژمارەی پێداچوونەوە بۆ ئەم کارتە: {p0}" values={{
            p0: t(currentCard.attempts || 0)
          }} /></p>
      </div> : <p className="empty-state"><Message source="یەک پرسیار و وەڵام زیاد بکە تا پێداچوونەوە دەست پێ بکەیت." /></p>}
    </section>

    <section className="panel stack" aria-labelledby={`${ids}-mistakes-title`}>
      <div><h2 className="section-heading" id={`${ids}-mistakes-title`}><Message source="دەفتەری هەڵە و فێربوون" /></h2><p className="muted"><Message source="هەڵە و ڕێگای ڕاستکردنەوەی تۆمار بکە؛ دواتر بەبێ سەیرکردنی چارەسەرەکە دووبارە هەوڵ بدە." /></p></div>
      <p className="badge"><Message source="{p0} تۆمار کاتی پێداچوونەوەی هاتووە" values={{
          p0: t(mistakes.filter(entry => isReviewDue(entry.nextReviewDate, today)).length)
        }} /></p>
      <form className="stack" onSubmit={saveMistake}>
        <label className="stack" htmlFor={`${ids}-mistake-subject`}><Message source="وانە{p0}" values={{
            p0: <input className="input" id={`${ids}-mistake-subject`} required maxLength="120" value={mistakeSubject} onChange={event => setMistakeSubject(event.target.value)} />
          }} /></label>
        <div className="grid-two"><label className="stack" htmlFor={`${ids}-mistake-question`}><Message source="پرسیار یان هەڵەکە{p0}" values={{
              p0: <textarea className="input" id={`${ids}-mistake-question`} required rows="3" maxLength="5000" value={mistakeQuestion} onChange={event => setMistakeQuestion(event.target.value)} />
            }} /></label><label className="stack" htmlFor={`${ids}-mistake-correction`}><Message source="ڕاستکردنەوە و هۆکاری هەڵەکە{p0}" values={{
              p0: <textarea className="input" id={`${ids}-mistake-correction`} required rows="3" maxLength="5000" value={mistakeCorrection} onChange={event => setMistakeCorrection(event.target.value)} />
            }} /></label></div>
        <div className="tool-actions"><button type="submit" className="btn btn-primary" disabled={!mistakeSubject.trim() || !mistakeQuestion.trim() || !mistakeCorrection.trim()}>{t(mistakeEditId ? 'هەڵگرتنی گۆڕانکاری' : 'تۆمارکردنی فێربوون')}</button>{mistakeEditId && <button type="button" className="btn btn-secondary" onClick={clearMistake}><Message source="پاشگەزبوونەوە" /></button>}</div>
      </form><p className="muted" role="status">{t(mistakeMessage)}</p>
      {sortedMistakes.length ? <ul className="tool-list stack">{sortedMistakes.map(entry => <li className="tool-entry stack" key={entry.id}>
        <div className="tool-actions"><strong>{entry.subject}</strong><span className="badge">{t(isReviewDue(entry.nextReviewDate, today) ? 'کاتی پێداچوونەوە هاتووە' : `پێداچوونەوە: ${entry.nextReviewDate}`)}</span></div><p className="tool-text">{entry.question}</p>
        <label className="stack" htmlFor={`${ids}-reattempt-${entry.id}`}><Message source="ئەمجارە چۆنت چارەسەر کرد؟ هەنگاو و هۆکارەکان بنووسە{p0}" values={{
              p0: <textarea className="input" id={`${ids}-reattempt-${entry.id}`} rows="2" maxLength="5000" value={reattemptDrafts[entry.id] || ''} onChange={event => setReattemptDrafts(previous => ({
                ...previous,
                [entry.id]: event.target.value
              }))} />
            }} /></label>
        <button type="button" className="btn btn-secondary" disabled={!(reattemptDrafts[entry.id] || '').trim()} aria-expanded={Boolean(revealedMistakes[entry.id])} aria-controls={`${ids}-correction-${entry.id}`} onClick={() => setRevealedMistakes(previous => ({
            ...previous,
            [entry.id]: !previous[entry.id]
          }))}>{t(revealedMistakes[entry.id] ? 'شاردنەوەی ڕاستکردنەوە' : 'بەراوردکردن بە ڕاستکردنەوەکە')}</button>
        <div id={`${ids}-correction-${entry.id}`} hidden={!revealedMistakes[entry.id]}><span className="muted"><Message source="ڕاستکردنەوە:" /></span><p className="tool-text">{entry.correction}</p></div>
        <div className="tool-actions"><button type="button" className="btn btn-primary" disabled={!revealedMistakes[entry.id] || !(reattemptDrafts[entry.id] || '').trim()} onClick={() => logReattempt(entry, true)}><Message source="بەپێی بەراوردەکەم ڕاست بوو" /></button><button type="button" className="btn btn-secondary" disabled={!revealedMistakes[entry.id] || !(reattemptDrafts[entry.id] || '').trim()} onClick={() => logReattempt(entry, false)}><Message source="هێشتا پێویستم بە ڕاهێنانە" /></button></div>
        <p className="muted"><Message source="هەوڵی تۆمارکراو: {p0}{p1}. نیشانەکە هەڵسەنگاندنی خۆتە." values={{
              p0: t(entry.reattempts || 0),
              p1: t(entry.lastReattempt ? ` · دوا هەوڵ: ${entry.lastReattempt}` : '')
            }} /></p>
        {entry.reattemptExplanation && <details><summary><Message source="تێبینی دوا هەوڵەکەم" /></summary><p className="tool-text">{entry.reattemptExplanation}</p></details>}
        <div className="tool-actions"><button type="button" className="btn btn-secondary" aria-label={t(`دەستکاریکردنی تۆماری ${entry.subject}`)} onClick={() => editMistake(entry)}><Message source="دەستکاری" /></button><button type="button" className="btn btn-secondary" aria-label={t(`سڕینەوەی تۆماری ${entry.subject}`)} onClick={() => deleteMistake(entry.id)}><Message source="سڕینەوە" /></button></div>
      </li>)}</ul> : <p className="empty-state"><Message source="هێشتا تۆمارێکت نییە. کاتێک هەڵەیەکت دۆزییەوە، ڕێگای ڕاستکردنەوەکەشی لێرە هەڵبگرە." /></p>}
    </section>
  </div>;
}
