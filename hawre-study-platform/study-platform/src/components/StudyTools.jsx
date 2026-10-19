import { useCallback, useEffect, useId, useRef, useState } from 'react';

const DAYS = [
  ['saturday', 'شەممە'],
  ['sunday', 'یەکشەممە'],
  ['monday', 'دووشەممە'],
  ['tuesday', 'سێشەممە'],
  ['wednesday', 'چوارشەممە'],
  ['thursday', 'پێنجشەممە'],
  ['friday', 'هەینی'],
];

function makeId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function boundedMinutes(value, fallback = 25) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.min(180, Math.max(1, Math.round(number)))
    : fallback;
}

function defaultSubject(profile) {
  if (typeof profile?.subject === 'string') return profile.subject;
  if (typeof profile?.subjects?.[0] === 'string') return profile.subjects[0];
  return '';
}

function clockText(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function StudyTools({ profile, sessions = [], setSessions, tools = {}, setTools }) {
  const ids = useId();
  const flashcards = Array.isArray(tools.flashcards) ? tools.flashcards : [];
  const mistakes = Array.isArray(tools.mistakes) ? tools.mistakes : [];
  const timetable = Array.isArray(tools.timetable) ? tools.timetable : [];
  const subjectDefault = defaultSubject(profile);

  const [focusMinutes, setFocusMinutes] = useState(() => boundedMinutes(profile?.dailyMinutes));
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerSubject, setTimerSubject] = useState(subjectDefault);
  const [phase, setPhase] = useState('study');
  const [remainingMs, setRemainingMs] = useState(() => boundedMinutes(profile?.dailyMinutes) * 60_000);
  const [running, setRunning] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');
  // The run is separate from React rendering. Completing the same run twice is harmless,
  // including when development StrictMode starts an effect twice.
  const runRef = useRef(null);

  const finishRun = useCallback((run) => {
    if (runRef.current !== run || run.completed) return;
    run.completed = true;
    run.running = false;
    runRef.current = null;
    setRemainingMs(0);
    setRunning(false);
    if (run.phase === 'study') {
      const completed = {
        id: run.id,
        date: localDate(new Date(run.deadline)),
        minutes: run.minutes,
        subject: run.subject,
      };
      setSessions((previous) => {
        const list = Array.isArray(previous) ? previous : [];
        return list.some((session) => session.id === completed.id) ? list : [...list, completed];
      });
      setTimerMessage('کاتی خوێندن تەواو بوو و لە پێشکەوتنەکەت تۆمار کرا. ئێستا پشوویەکی کورت بدە.');
    } else {
      setTimerMessage('کاتی پشوو تەواو بوو. کاتێک ئامادە بوویت، خولی خوێندنێکی نوێ دەست پێ بکە.');
    }
  }, [setSessions]);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const run = runRef.current;
      if (!run?.running || run.completed) return;
      // A deadline avoids a slow countdown after an inactive tab or computer sleep.
      const next = Math.max(0, run.deadline - Date.now());
      setRemainingMs(next);
      if (next === 0) finishRun(run);
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
        completed: false,
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
    if (next === 0) {
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

  function changeMinutes(nextValue, target) {
    const minutes = boundedMinutes(nextValue, 1);
    if (target === 'study') setFocusMinutes(minutes);
    else setBreakMinutes(minutes);
    if (phase === target && !runRef.current) setRemainingMs(minutes * 60_000);
  }

  const [scheduleDay, setScheduleDay] = useState('saturday');
  const [scheduleSubject, setScheduleSubject] = useState(subjectDefault);
  const [scheduleTime, setScheduleTime] = useState('16:00');
  const [scheduleEditId, setScheduleEditId] = useState(null);
  const [scheduleMessage, setScheduleMessage] = useState('');

  function clearScheduleForm() {
    setScheduleEditId(null);
    setScheduleSubject('');
    setScheduleTime('16:00');
  }

  function saveSchedule(event) {
    event.preventDefault();
    if (!scheduleSubject.trim() || !/^\d{2}:\d{2}$/.test(scheduleTime)) return;
    const item = { id: scheduleEditId || makeId('schedule'), day: scheduleDay, subject: scheduleSubject.trim(), time: scheduleTime };
    setTools((previous) => {
      const list = Array.isArray(previous?.timetable) ? previous.timetable : [];
      return { ...previous, timetable: scheduleEditId ? list.map((entry) => entry.id === scheduleEditId ? { ...entry, ...item } : entry) : [...list, item] };
    });
    setScheduleMessage(scheduleEditId ? 'خشتەکە نوێ کرایەوە.' : 'کاتی خوێندن زیاد کرا.');
    clearScheduleForm();
  }

  function editSchedule(entry) {
    setScheduleEditId(entry.id);
    setScheduleDay(entry.day);
    setScheduleSubject(entry.subject);
    setScheduleTime(entry.time);
    setScheduleMessage('');
    document.getElementById(`${ids}-schedule-subject`)?.focus();
  }

  function deleteSchedule(id) {
    setTools((previous) => ({ ...previous, timetable: (previous?.timetable || []).filter((entry) => entry.id !== id) }));
    if (scheduleEditId === id) clearScheduleForm();
    setScheduleMessage('کاتی خوێندن لە خشتەکە سڕایەوە.');
  }

  const [cardQuestion, setCardQuestion] = useState('');
  const [cardAnswer, setCardAnswer] = useState('');
  const [cardSubject, setCardSubject] = useState(subjectDefault);
  const [cardEditId, setCardEditId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [cardMessage, setCardMessage] = useState('');
  const cardIndex = Math.max(0, flashcards.findIndex((card) => card.id === selectedCardId));
  const currentCard = flashcards[cardIndex];

  useEffect(() => { setCardRevealed(false); }, [currentCard?.id, currentCard?.answer]);

  function clearCardForm() {
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
      subject: cardSubject.trim(),
    };
    setTools((previous) => {
      const list = Array.isArray(previous?.flashcards) ? previous.flashcards : [];
      return {
        ...previous,
        flashcards: cardEditId
          ? list.map((entry) => entry.id === cardEditId ? { ...entry, ...item } : entry)
          : [...list, { ...item, status: 'review', createdAt: new Date().toISOString() }],
      };
    });
    setSelectedCardId(item.id);
    setCardRevealed(false);
    setCardMessage(cardEditId ? 'کارتەکە نوێ کرایەوە.' : 'کارتەکە زیاد کرا؛ سەرەتا خۆت هەوڵی وەڵامدانەوە بدە.');
    clearCardForm();
  }

  function editCard(card) {
    setCardEditId(card.id);
    setCardQuestion(card.question);
    setCardAnswer(card.answer);
    setCardSubject(card.subject || '');
    document.getElementById(`${ids}-card-question`)?.focus();
  }

  function changeCardStatus(status) {
    if (!currentCard) return;
    setTools((previous) => ({ ...previous, flashcards: (previous?.flashcards || []).map((entry) => entry.id === currentCard.id ? { ...entry, status } : entry) }));
    setCardMessage(status === 'known' ? 'ئەم کارتەت وەک فێربوو تۆمار کرد.' : 'ئەم کارتەت بۆ پێداچوونەوە نیشان کرد.');
  }

  function moveCard(direction) {
    if (!flashcards.length) return;
    const next = (cardIndex + direction + flashcards.length) % flashcards.length;
    setSelectedCardId(flashcards[next].id);
    setCardRevealed(false);
  }

  function deleteCard(id) {
    setTools((previous) => ({ ...previous, flashcards: (previous?.flashcards || []).filter((entry) => entry.id !== id) }));
    setCardRevealed(false);
    if (cardEditId === id) clearCardForm();
    setCardMessage('کارتەکە سڕایەوە.');
  }

  const [mistakeSubject, setMistakeSubject] = useState(subjectDefault);
  const [mistakeQuestion, setMistakeQuestion] = useState('');
  const [mistakeCorrection, setMistakeCorrection] = useState('');
  const [mistakeEditId, setMistakeEditId] = useState(null);
  const [mistakeMessage, setMistakeMessage] = useState('');

  function clearMistakeForm() {
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
    };
    setTools((previous) => {
      const list = Array.isArray(previous?.mistakes) ? previous.mistakes : [];
      return {
        ...previous,
        mistakes: mistakeEditId
          ? list.map((entry) => entry.id === mistakeEditId ? { ...entry, ...item } : entry)
          : [...list, { ...item, resolved: false, createdAt: new Date().toISOString() }],
      };
    });
    setMistakeMessage(mistakeEditId ? 'تۆمارەکە نوێ کرایەوە.' : 'هەڵەکە و ڕێگای ڕاستکردنەوەکەی تۆمار کران.');
    clearMistakeForm();
  }

  function editMistake(entry) {
    setMistakeEditId(entry.id);
    setMistakeSubject(entry.subject);
    setMistakeQuestion(entry.question);
    setMistakeCorrection(entry.correction);
    document.getElementById(`${ids}-mistake-question`)?.focus();
  }

  function deleteMistake(id) {
    setTools((previous) => ({ ...previous, mistakes: (previous?.mistakes || []).filter((entry) => entry.id !== id) }));
    if (mistakeEditId === id) clearMistakeForm();
    setMistakeMessage('تۆمارەکە سڕایەوە.');
  }

  const timerHasRun = Boolean(runRef.current);
  const today = localDate();
  const todayMinutes = sessions.filter((session) => session.date === today).reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
  const sortedTimetable = [...timetable].sort((first, second) => {
    const firstDay = DAYS.findIndex(([day]) => day === first.day);
    const secondDay = DAYS.findIndex(([day]) => day === second.day);
    return firstDay - secondDay || String(first.time).localeCompare(String(second.time));
  });

  return (
    <div className="stack study-tools" dir="rtl">
      <section className="panel stack" aria-labelledby={`${ids}-timer-title`}>
        <div>
          <h2 className="section-heading" id={`${ids}-timer-title`}>کاتی خوێندن و پشوو</h2>
          <p className="muted">ئەرکێکی بچووک هەڵبژێرە و دەست پێ بکە. تەنها خولی خوێندنی تەواوکراو لە پێشکەوتنەکەت تۆمار دەکرێت.</p>
        </div>
        <div className="tool-actions" role="group" aria-label="جۆری کاتژمێر">
          <button type="button" className={`btn ${phase === 'study' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => resetTimer('study')} disabled={timerHasRun} aria-pressed={phase === 'study'}>خوێندن</button>
          <button type="button" className={`btn ${phase === 'break' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => resetTimer('break')} disabled={timerHasRun} aria-pressed={phase === 'break'}>پشوو</button>
        </div>
        <div className="grid-two">
          <label className="stack" htmlFor={`${ids}-focus-minutes`}>کاتی خوێندن بە خولەک
            <input className="input" id={`${ids}-focus-minutes`} type="number" min="1" max="180" step="1" value={focusMinutes} disabled={timerHasRun} onChange={(event) => changeMinutes(event.target.value, 'study')} />
          </label>
          <label className="stack" htmlFor={`${ids}-break-minutes`}>کاتی پشوو بە خولەک
            <input className="input" id={`${ids}-break-minutes`} type="number" min="1" max="180" step="1" value={breakMinutes} disabled={timerHasRun} onChange={(event) => changeMinutes(event.target.value, 'break')} />
          </label>
        </div>
        <label className="stack" htmlFor={`${ids}-timer-subject`}>وانە یان ئەرکی ئەم خولە
          <input className="input" id={`${ids}-timer-subject`} value={timerSubject} maxLength="160" disabled={timerHasRun} onChange={(event) => setTimerSubject(event.target.value)} placeholder="بۆ نموونە: چارەسەرکردنی سێ پرسیاری بیرکاری" />
        </label>
        <output className="focus-clock" role="timer" aria-live="off" aria-label="کاتی ماوە" dir="ltr">{clockText(remainingMs)}</output>
        <div className="tool-actions">
          {running
            ? <button type="button" className="btn btn-primary" onClick={pauseTimer}>وەستاندنی کاتی</button>
            : <button type="button" className="btn btn-primary" onClick={startTimer}>{timerHasRun ? 'بەردەوامبوون' : 'دەستپێکردن'}</button>}
          <button type="button" className="btn btn-secondary" onClick={() => resetTimer()}>لە سەرەتاوە</button>
          {!timerHasRun && remainingMs === 0 && <button type="button" className="btn btn-secondary" onClick={() => resetTimer(phase === 'study' ? 'break' : 'study')}>{phase === 'study' ? 'ئامادەکردنی پشوو' : 'ئامادەکردنی خوێندن'}</button>}
        </div>
        <p className="muted">ئەمڕۆ: {todayMinutes} خولەکی تەواوکراو. ئەگەر ئەم بەشە جێبهێڵیت یان پەڕەکە دابخەیت، کاتژمێری ناتەواو هەڵناگیرێت.</p>
        <p className="muted" role="status">{timerMessage}</p>
      </section>

      <section className="panel stack" aria-labelledby={`${ids}-schedule-title`}>
        <div>
          <h2 className="section-heading" id={`${ids}-schedule-title`}>خشتەی هەفتانەی من</h2>
          <p className="muted">کاتێکی گونجاو بۆ خۆت دیاری بکە. لە هەر ڕۆژێک دەتوانیت زیاتر لە کاتێک زیاد بکەیت.</p>
        </div>
        <form className="stack" onSubmit={saveSchedule}>
          <div className="grid-two">
            <label className="stack" htmlFor={`${ids}-schedule-day`}>ڕۆژ
              <select className="input" id={`${ids}-schedule-day`} value={scheduleDay} onChange={(event) => setScheduleDay(event.target.value)}>{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="stack" htmlFor={`${ids}-schedule-time`}>کاتی دەستپێکردن
              <input className="input" id={`${ids}-schedule-time`} type="time" required value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
            </label>
          </div>
          <label className="stack" htmlFor={`${ids}-schedule-subject`}>وانە یان ئەرک
            <input className="input" id={`${ids}-schedule-subject`} required maxLength="200" value={scheduleSubject} onChange={(event) => setScheduleSubject(event.target.value)} />
          </label>
          <div className="tool-actions">
            <button className="btn btn-primary" type="submit" disabled={!scheduleSubject.trim() || !scheduleTime}>{scheduleEditId ? 'هەڵگرتنی گۆڕانکاری' : 'زیادکردن بۆ خشتە'}</button>
            {scheduleEditId && <button className="btn btn-secondary" type="button" onClick={clearScheduleForm}>پاشگەزبوونەوە</button>}
          </div>
        </form>
        <p className="muted" role="status">{scheduleMessage}</p>
        {sortedTimetable.length ? <ul className="tool-list stack">{sortedTimetable.map((entry) => <li className="tool-entry" key={entry.id}>
          <div><strong>{DAYS.find(([day]) => day === entry.day)?.[1] || entry.day}</strong> · <time dir="ltr">{entry.time}</time><p className="tool-text">{entry.subject}</p></div>
          <div className="tool-actions"><button type="button" className="btn btn-secondary" aria-label={`دەستکاریکردنی ${entry.subject}`} onClick={() => editSchedule(entry)}>دەستکاری</button><button type="button" className="btn btn-secondary" aria-label={`سڕینەوەی ${entry.subject} لە خشتە`} onClick={() => deleteSchedule(entry.id)}>سڕینەوە</button></div>
        </li>)}</ul> : <p className="empty-state">هێشتا کاتێکت زیاد نەکردووە. بە یەک کاتی بچووک دەست پێ بکە.</p>}
      </section>

      <section className="panel stack" aria-labelledby={`${ids}-cards-title`}>
        <div>
          <h2 className="section-heading" id={`${ids}-cards-title`}>کارتەکانی پرسیار و وەڵام</h2>
          <p className="muted">پرسیارەکە بخوێنەوە، بەبێ سەیرکردن وەڵام بدەرەوە، پاشان وەڵامەکەت بەراورد بکە.</p>
        </div>
        <form className="stack" onSubmit={saveCard}>
          <label className="stack" htmlFor={`${ids}-card-subject`}>وانە <span className="muted">(ئارەزوومەندانە)</span>
            <input className="input" id={`${ids}-card-subject`} maxLength="120" value={cardSubject} onChange={(event) => setCardSubject(event.target.value)} />
          </label>
          <div className="grid-two">
            <label className="stack" htmlFor={`${ids}-card-question`}>پرسیار
              <textarea className="input" id={`${ids}-card-question`} required rows="3" maxLength="3000" value={cardQuestion} onChange={(event) => setCardQuestion(event.target.value)} />
            </label>
            <label className="stack" htmlFor={`${ids}-card-answer`}>وەڵامی ڕاست
              <textarea className="input" id={`${ids}-card-answer`} required rows="3" maxLength="5000" value={cardAnswer} onChange={(event) => setCardAnswer(event.target.value)} />
            </label>
          </div>
          <div className="tool-actions">
            <button type="submit" className="btn btn-primary" disabled={!cardQuestion.trim() || !cardAnswer.trim()}>{cardEditId ? 'هەڵگرتنی گۆڕانکاری' : 'زیادکردنی کارت'}</button>
            {cardEditId && <button type="button" className="btn btn-secondary" onClick={clearCardForm}>پاشگەزبوونەوە</button>}
          </div>
        </form>
        <p className="muted" role="status">{cardMessage}</p>
        {currentCard ? <div className="study-card stack">
          <div className="tool-actions"><span className="badge">کارت {cardIndex + 1} لە {flashcards.length}</span><span className="badge">{currentCard.status === 'known' ? 'فێربووم' : 'پێویستی بە پێداچوونەوە هەیە'}</span>{currentCard.subject && <span className="muted">{currentCard.subject}</span>}</div>
          <p className="tool-text"><strong>{currentCard.question}</strong></p>
          <button type="button" className="btn btn-secondary" aria-expanded={cardRevealed} aria-controls={`${ids}-card-answer-display`} onClick={() => setCardRevealed((value) => !value)}>{cardRevealed ? 'شاردنەوەی وەڵام' : 'پیشاندانی وەڵام'}</button>
          <div id={`${ids}-card-answer-display`} hidden={!cardRevealed}><p className="tool-text">{currentCard.answer}</p></div>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={() => changeCardStatus('known')}>فێربووم</button>
            <button type="button" className="btn btn-secondary" onClick={() => changeCardStatus('review')}>دووبارەی دەکەمەوە</button>
            <button type="button" className="btn btn-secondary" onClick={() => editCard(currentCard)}>دەستکاری</button>
            <button type="button" className="btn btn-secondary" onClick={() => deleteCard(currentCard.id)}>سڕینەوەی کارت</button>
          </div>
          <div className="tool-actions" aria-label="گواستنەوە لە نێوان کارتەکان">
            <button type="button" className="btn btn-secondary" disabled={flashcards.length < 2} onClick={() => moveCard(-1)}>کارتی پێشوو</button>
            <button type="button" className="btn btn-secondary" disabled={flashcards.length < 2} onClick={() => moveCard(1)}>کارتی دواتر</button>
          </div>
          <p className="muted">{flashcards.filter((card) => card.status === 'known').length} کارت فێربوویت؛ {flashcards.filter((card) => card.status !== 'known').length} کارت بۆ پێداچوونەوە ماون.</p>
        </div> : <p className="empty-state">یەک پرسیار و وەڵام لە وانەکەت زیاد بکە تا پێداچوونەوە دەست پێ بکەیت.</p>}
      </section>

      <section className="panel stack" aria-labelledby={`${ids}-mistakes-title`}>
        <div>
          <h2 className="section-heading" id={`${ids}-mistakes-title`}>دەفتەری هەڵە و فێربوون</h2>
          <p className="muted">هەڵەیەک تۆمار بکە و بنووسە چۆن ڕاستی دەکەیتەوە. دواتر هەمان پرسیار بەبێ سەیرکردنی وەڵام چارەسەر بکە.</p>
        </div>
        <form className="stack" onSubmit={saveMistake}>
          <label className="stack" htmlFor={`${ids}-mistake-subject`}>وانە
            <input className="input" id={`${ids}-mistake-subject`} required maxLength="120" value={mistakeSubject} onChange={(event) => setMistakeSubject(event.target.value)} />
          </label>
          <div className="grid-two">
            <label className="stack" htmlFor={`${ids}-mistake-question`}>پرسیار یان هەڵەکە
              <textarea className="input" id={`${ids}-mistake-question`} required rows="3" maxLength="5000" value={mistakeQuestion} onChange={(event) => setMistakeQuestion(event.target.value)} />
            </label>
            <label className="stack" htmlFor={`${ids}-mistake-correction`}>ڕاستکردنەوە و ئەوەی فێری بوویت
              <textarea className="input" id={`${ids}-mistake-correction`} required rows="3" maxLength="5000" value={mistakeCorrection} onChange={(event) => setMistakeCorrection(event.target.value)} />
            </label>
          </div>
          <div className="tool-actions">
            <button type="submit" className="btn btn-primary" disabled={!mistakeSubject.trim() || !mistakeQuestion.trim() || !mistakeCorrection.trim()}>{mistakeEditId ? 'هەڵگرتنی گۆڕانکاری' : 'تۆمارکردنی فێربوون'}</button>
            {mistakeEditId && <button type="button" className="btn btn-secondary" onClick={clearMistakeForm}>پاشگەزبوونەوە</button>}
          </div>
        </form>
        <p className="muted" role="status">{mistakeMessage}</p>
        {mistakes.length ? <ul className="tool-list stack">{[...mistakes].reverse().map((entry) => <li className="tool-entry stack" key={entry.id}>
          <strong>{entry.subject}</strong>
          <p className="tool-text">{entry.question}</p>
          <div><span className="muted">ڕاستکردنەوە:</span><p className="tool-text">{entry.correction}</p></div>
          <label className="tool-check"><input type="checkbox" checked={Boolean(entry.resolved)} onChange={(event) => {
            const resolved = event.target.checked;
            setTools((previous) => ({ ...previous, mistakes: (previous?.mistakes || []).map((item) => item.id === entry.id ? { ...item, resolved } : item) }));
          }} /> دووبارە خۆم چارەسەرم کردەوە</label>
          <div className="tool-actions"><button type="button" className="btn btn-secondary" aria-label={`دەستکاریکردنی تۆماری ${entry.subject}`} onClick={() => editMistake(entry)}>دەستکاری</button><button type="button" className="btn btn-secondary" aria-label={`سڕینەوەی تۆماری ${entry.subject}`} onClick={() => deleteMistake(entry.id)}>سڕینەوە</button></div>
        </li>)}</ul> : <p className="empty-state">هێشتا تۆمارێکت نییە. کاتێک هەڵەیەکت دۆزییەوە، ڕێگای ڕاستکردنەوەکەشی لێرە هەڵبگرە.</p>}
      </section>
    </div>
  );
}
