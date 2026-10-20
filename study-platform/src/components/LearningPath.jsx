import { formatDateTime } from "../i18n/runtime.js";
import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import React, { useEffect, useState } from 'react';
import { learningTopics, learningTopicById } from '../data/learningTopics.js';
import { LEARNING_STAGES, allQuestionsAnswered, followupDueAt, isFollowupDue, isValidChoice, sanitizeLearning, scoreQuestions } from '../utils/learning.js';
const stageNames = {
  baseline: 'پشکنینی سەرەتا',
  example: 'نموونە',
  guided: 'ڕاهێنان بە یارمەتی',
  practice: 'ڕاهێنانی سەربەخۆ',
  reflection: 'ڕوونکردنەوەی خۆت',
  followup: 'پشکنینی دواتر',
  complete: 'بەراورد'
};
function Expression({
  children
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return children ? <p dir="ltr" style={{
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBlock: '0.8rem'
  }}><bdi dir="ltr">{t(children)}</bdi></p> : null;
}
function Passage({
  children
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return children ? <blockquote className="panel" style={{
    marginInline: 0,
    lineHeight: 2,
    borderInlineStart: '4px solid #4f46e5'
  }}>{t(children)}</blockquote> : null;
}
function QuestionChoices({
  question,
  answer,
  onAnswer,
  disabled,
  name
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const choices = [...question.options.map((text, value) => ({
    text,
    value
  })), {
    text: 'نازانم / هێشتا دڵنیا نیم',
    value: -1
  }];
  return <div className="stack" style={{
    gap: '0.5rem'
  }}>
    {choices.map(choice => <label key={choice.value} className="input" style={{
      display: 'flex',
      alignItems: 'start',
      gap: '0.6rem',
      cursor: disabled ? 'default' : 'pointer',
      background: answer === choice.value ? 'var(--selected-bg, rgba(99,102,241,0.10))' : undefined
    }}>
      <input type="radio" name={name} value={choice.value} checked={answer === choice.value} onChange={() => onAnswer(choice.value)} disabled={disabled} style={{
        marginTop: '0.35rem'
      }} />
      <span>{choice.value >= 0 && question.expression ? <bdi dir="ltr">{t(choice.text)}</bdi> : t(choice.text)}</span>
    </label>)}
  </div>;
}
function AnswerFeedback({
  question,
  answer
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const correct = answer === question.correctIndex;
  return <div className="panel" style={{
    marginTop: '0.75rem',
    borderInlineStart: `4px solid ${correct ? '#059669' : '#d97706'}`
  }}>
    <strong>{t(correct ? 'وەڵامەکەت ڕاستە.' : answer === -1 ? 'هەڵبژاردنی «نازانم» یارمەتیمان دەدات پێویستییەکەت بزانین.' : 'ئەم وەڵامە دەگونجێت بپشکنرێتەوە.')}</strong>
    {!correct && <p><Message source="وەڵامی ڕاست: {p0}" values={{
        p0: <bdi dir={question.expression ? 'ltr' : 'auto'}>{t(question.options[question.correctIndex])}</bdi>
      }} /></p>}
    <p>{t(question.explanation)}</p>
  </div>;
}
function QuestionSet({
  title,
  questions,
  passage,
  snapshot,
  onAnswer,
  onConfidence,
  onSubmit
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const submitted = Boolean(snapshot.completedAt);
  const score = scoreQuestions(questions, snapshot.answers);
  return <section className="stack" aria-label={t(title)}>
    <h3>{t(title)}</h3>
    <Passage>{t(passage)}</Passage>
    {!submitted && <p className="muted"><Message source="پێش بینینی چارەسەر هەوڵ بدە. ئەگەر نازانیت، «نازانم» هەڵبژێرە. دڵنیایی ئارەزوومەندانەیە و کاریگەری لە ئەنجام نییە." /></p>}
    <form onSubmit={event => {
      event.preventDefault();
      if (!submitted && allQuestionsAnswered(questions, snapshot.answers)) onSubmit();
    }} className="stack">
      {questions.map((question, index) => <fieldset key={question.id} className="panel" style={{
        minWidth: 0
      }}>
        <legend style={{
          fontWeight: 700
        }}>{t(index + 1)}. {t(question.prompt)}</legend>
        <Expression>{t(question.expression)}</Expression>
        <QuestionChoices question={question} answer={snapshot.answers[question.id]} onAnswer={answer => onAnswer(question.id, answer)} disabled={submitted} name={question.id} />
        {onConfidence && <label style={{
          display: 'block',
          marginTop: '0.75rem'
        }}><Message source="دڵنیاییت لە وەڵامەکەت چەندە؟ {p0}{p1}" values={{
            p0: <span className="muted"><Message source="(ئارەزوومەندانە)" /></span>,
            p1: <select className="input" value={snapshot.confidence?.[question.id] ?? ''} disabled={submitted} onChange={event => onConfidence(question.id, event.target.value === '' ? null : Number(event.target.value))}>
            <option value=""><Message source="هەڵنەبژێردراوە" /></option><option value={1}><Message source="دڵنیا نیم" /></option><option value={2}><Message source="تا ڕادەیەک دڵنیام" /></option><option value={3}><Message source="زۆر دڵنیام" /></option>
          </select>
          }} /></label>}
        {submitted && <AnswerFeedback question={question} answer={snapshot.answers[question.id]} />}
      </fieldset>)}
      {submitted ? <p className="panel" role="status"><Message source="لە هەوڵی یەکەمدا {p0} لە {p1} وەڵامت ڕاست بوو. ئەم سێ پرسیارە تەنها نیشاندەرێکی بچووکی ئەم بابەتەن؛ پێوانەی توانای گشتی یان نمرەی قوتابخانە نین." values={{
          p0: t(score.correct),
          p1: t(score.total)
        }} /></p> : <>
        <p className="muted" aria-live="polite"><Message source="{p0} لە {p1} پرسیار وەڵام دراوەتەوە." values={{
            p0: t(score.answered),
            p1: t(score.total)
          }} /></p>
        <button className="btn btn-primary" type="submit" disabled={!allQuestionsAnswered(questions, snapshot.answers)}><Message source="پشکنینی وەڵامەکان و بینینی ڕوونکردنەوە" /></button>
      </>}
    </form>
  </section>;
}
function downloadTopics(t) {
  const localize = value => typeof value === 'string' ? t(value) : Array.isArray(value) ? value.map(localize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v)])) : value;
  const payload = {
    title: t('هاوڕێ — نموونەی دەستپێکی ڕاهێنان'),
    reviewStatus: t('هێشتا لەلایەن مامۆستاوە پێداچوونەوەی بۆ نەکراوە؛ بە کۆرسی دیاریکراوی قوتابخانە نەبەستراوەتەوە.'),
    topics: localize(learningTopics)
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'hawre-starter-topics-for-review.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function LearningPath({
  learning,
  setLearning,
  onOpenPlan,
  onAskSupport
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  const safe = sanitizeLearning(learning);
  const topic = learningTopicById[safe.activeTopic];
  const state = safe.topics[topic.id];
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const update = change => setLearning(previous => {
    const next = sanitizeLearning(previous);
    const current = next.topics[topic.id];
    next.topics[topic.id] = {
      ...current,
      ...(typeof change === 'function' ? change(current) : change),
      lastWorkedAt: new Date().toISOString()
    };
    return next;
  });
  const answerSnapshot = (kind, id, answer) => update(current => {
    if (current[kind].completedAt) return {};
    const question = topic[kind].find(item => item.id === id);
    if (!question || !isValidChoice(question, answer)) return {};
    return {
      [kind]: {
        ...current[kind],
        answers: {
          ...current[kind].answers,
          [id]: answer
        }
      }
    };
  });
  const confidenceSnapshot = (kind, id, confidence) => update(current => {
    if (current[kind].completedAt || !topic[kind].some(question => question.id === id)) return {};
    const nextConfidence = {
      ...current[kind].confidence
    };
    if (confidence === null) delete nextConfidence[id];else if ([1, 2, 3].includes(confidence)) nextConfidence[id] = confidence;
    return {
      [kind]: {
        ...current[kind],
        confidence: nextConfidence
      }
    };
  });
  const submitSnapshot = kind => update(current => {
    if (current[kind].completedAt || !allQuestionsAnswered(topic[kind], current[kind].answers)) return {};
    if (kind === 'followup' && !isFollowupDue(current)) return {};
    const completedAt = new Date().toISOString();
    return {
      [kind]: {
        ...current[kind],
        completedAt
      },
      ...(kind === 'practice' ? {
        followupDueAt: followupDueAt(completedAt)
      } : {}),
      ...(kind === 'followup' ? {
        stage: 'complete'
      } : {})
    };
  });
  const practiceScore = scoreQuestions(topic.practice, state.practice.answers);
  const before = scoreQuestions(topic.baseline, state.baseline.answers);
  const after = scoreQuestions(topic.followup, state.followup.answers);
  const currentTargets = topic.baseline.filter(question => state.baseline.answers[question.id] !== question.correctIndex);
  const due = isFollowupDue(state, now);
  const currentStageIndex = LEARNING_STAGES.indexOf(state.stage);
  return <div className="stack" dir={direction}>
    <section className="panel stack">
      <div className="section-heading"><h2><Message source="ڕێگای فێربوون" /></h2><span className="badge"><Message source="هەنگاو بە هەنگاو" /></span></div>
      <p><Message source="بزانە لە کوێ پێویستت بە یارمەتییە، نموونە ببینە، خۆت ڕاهێنان بکە و دواتر بە پرسیاری نوێ تێگەیشتنت بپشکنەوە." /></p>
      <p className="muted"><Message source="ئەمە ڕاهێنانی سەرەتایی و گشتییە؛ بە کۆرسی دیاریکراوی قوتابخانە نەبەستراوەتەوە و هێشتا پێداچوونەوەی مامۆستای بۆ نەکراوە. بۆ بابەت و ئاستی وانەکەت ڕای مامۆستاکەت وەربگرە." /></p>
      <label><Message source="بابەت هەڵبژێرە {p0}" values={{
          p0: <select className="input" value={topic.id} onChange={event => {
            const id = event.target.value;
            if (Object.hasOwn(learningTopicById, id)) setLearning(previous => ({
              ...sanitizeLearning(previous),
              activeTopic: id
            }));
          }}>{learningTopics.map(item => <option key={item.id} value={item.id}>{t(item.subject)} — {t(item.title)}</option>)}</select>
        }} /></label>
      <p><strong><Message source="ئامانج:" /></strong> {t(topic.goal)}</p>
      <details><summary><Message source="ئەگەر بنەمای بابەتەکە قورسە، لێرە دەست پێ بکە" /></summary><p>{t(topic.prerequisite)}</p></details>
      <details><summary><Message source="بابەتەکان بۆ پێداچوونەوەی مامۆستا" /></summary>
        <p><Message source="دەتوانیت پرسیار، وەڵام و ڕوونکردنەوەکان دابگریت و خۆت لەگەڵ مامۆستاکەت پێداچوونەوەیان بۆ بکەیت. داگرتنەکە هیچ وەڵام یان زانیارییەکی کەسیی قوتابی تێدا نییە." /></p>
        <button type="button" className="btn btn-secondary" onClick={() => downloadTopics(t)}><Message source="داگرتنی ناوەڕۆکی ڕاهێنانەکان" /></button>
      </details>
      <ol aria-label={t("هەنگاوەکانی فێربوون")} className="muted" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem 1.7rem',
        paddingInlineStart: '1.4rem'
      }}>
        {LEARNING_STAGES.map((stage, index) => <li key={stage} aria-current={state.stage === stage ? 'step' : undefined} style={{
          fontWeight: state.stage === stage ? 700 : 400
        }}>{t(stageNames[stage])}{t(index < currentStageIndex ? ' ✓' : '')}</li>)}
      </ol>
    </section>

    <section className="panel stack" key={topic.id}>
      {state.stage === 'baseline' && <>
        <QuestionSet title={t("پشکنینی سەرەتا — بێ فشار و بێ نمرەی قوتابخانە")} questions={topic.baseline} passage={topic.baselinePassage} snapshot={state.baseline} onAnswer={(id, answer) => answerSnapshot('baseline', id, answer)} onConfidence={(id, confidence) => confidenceSnapshot('baseline', id, confidence)} onSubmit={() => submitSnapshot('baseline')} />
        {state.baseline.completedAt && <>
          <div className="panel stack">
            <h4><Message source="هەنگاوی گونجاو بەپێی ئەم هەوڵە" /></h4>
            <p>{t(before.correct < 2 ? 'لە ئەم هەوڵەدا زۆربەی پرسیارەکان هێشتا پێویستیان بە پشتگیری هەیە. سەرەتا بنەمای خوارەوە بخوێنەوە؛ پاشان نموونەکە بە هەنگاوەکانییەوە ببینە. ئەگەر بنەماکەش نادیارە، داوای ڕوونکردنەوە بکە.' : before.correct === 2 ? 'لە دوو پرسیاردا وەڵامت ڕاستە. سەرنج بخەرە سەر ئەو پرسیارەی خوارەوە و ڕوونکردنەوەکەی؛ پاشان ببینە چۆن نموونەکە یارمەتیت دەدات ئەو خاڵە ڕوون بکەیتەوە.' : 'لە هەرسێ پرسیارەکەدا وەڵامت ڕاستە. هەنگاوی ئێستا جێبەجێکردنی ڕێگاکەیە لە پرسیاری نوێدا، لەگەڵ ڕوونکردنەوەی هۆکاری هەر هەنگاوێک. ئەم سێ وەڵامە بە تەنها بەڵگەی زاڵبوون بەسەر تەواوی بابەتەکەدا نین.')}</p>
            {before.correct < 2 && <details open><summary><Message source="بنەمای دەستپێکردن" /></summary><p>{t(topic.prerequisite)}</p></details>}
            {currentTargets.length > 0 ? <>
              <strong><Message source="پرسیارەکانی ئامانجی ئێستات" /></strong>
              <ul>{currentTargets.map(question => <li key={question.id}>{t(question.prompt)}{question.expression && <> <bdi dir="ltr">{t(question.expression)}</bdi></>}</li>)}</ul>
              <p className="muted"><Message source="ڕوونکردنەوەی ئەم وەڵامانە لە سەرەوە هەیە. بۆ هەریەکەیان دیاری بکە کام هەنگاو یان بەڵگە پێویستی بە ڕوونکردنەوە هەیە." /></p>
            </> : <p><strong><Message source="ئامانجی ئێستات:" /></strong> {t(topic.goal)}</p>}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => update({
            stage: 'example'
          })}><Message source="نموونەی چارەسەرکراو ببینە" /></button>
        </>}
      </>}

      {state.stage === 'example' && <>
        <h3>{t(topic.example.title)}</h3>
        <Passage>{t(topic.example.passage)}</Passage>
        <Expression>{t(topic.example.expression)}</Expression>
        <ol className="stack">{topic.example.steps.map((step, index) => <li key={index}><p>{t(step.text)}</p><Expression>{t(step.expression)}</Expression></li>)}</ol>
        <p className="muted"><Message source="لە هەر هەنگاوێکدا لە خۆت بپرسە: بۆچی ئەم هەنگاوە دروستە؟" /></p>
        <button type="button" className="btn btn-primary" onClick={() => update({
          exampleViewed: true,
          stage: 'guided'
        })}><Message source="ئێستا بە یارمەتی هەوڵ دەدەم" /></button>
      </>}

      {state.stage === 'guided' && <>
        <h3><Message source="ڕاهێنان بە یارمەتی" /></h3>
        <Passage>{t(topic.guided.passage)}</Passage>
        <fieldset className="panel" style={{
          minWidth: 0
        }}>
          <legend>{t(topic.guided.prompt)}</legend>
          <Expression>{t(topic.guided.expression)}</Expression>
          <QuestionChoices question={topic.guided} answer={state.guided.answer} onAnswer={answer => update(current => ({
            guided: {
              ...current.guided,
              answer
            }
          }))} disabled={state.guided.submitted} name={topic.guided.id} />
          {state.guided.hintLevel > 0 && <div role="status">{topic.guided.hints.slice(0, state.guided.hintLevel).map((hint, index) => <p key={index}><Message source="ڕێنمایی {p0}: {p1}" values={{
                p0: t(index + 1),
                p1: t(hint)
              }} /></p>)}</div>}
          <div className="section-heading" style={{
            marginTop: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button type="button" className="btn btn-secondary" disabled={state.guided.hintLevel >= topic.guided.hints.length || state.guided.submitted} onClick={() => update(current => ({
              guided: {
                ...current.guided,
                hintLevel: Math.min(topic.guided.hints.length, current.guided.hintLevel + 1)
              }
            }))}><Message source="ڕێنماییەکی تر" /></button>
            {!state.guided.submitted && <button type="button" className="btn btn-primary" disabled={!isValidChoice(topic.guided, state.guided.answer)} onClick={() => update(current => ({
              guided: {
                ...current.guided,
                submitted: true,
                attempts: Math.min(50, current.guided.attempts + 1)
              }
            }))}><Message source="پشکنینی وەڵام" /></button>}
          </div>
          {state.guided.submitted && <AnswerFeedback question={topic.guided} answer={state.guided.answer} />}
        </fieldset>
        {state.guided.submitted && <div className="section-heading" style={{
          flexWrap: 'wrap'
        }}>
          <button type="button" className="btn btn-secondary" onClick={() => update(current => ({
            guided: {
              ...current.guided,
              answer: null,
              submitted: false
            }
          }))}><Message source="بە هەمان پرسیار هەوڵێکی دیکە بدەم" /></button>
          <button type="button" className="btn btn-primary" onClick={() => update({
            stage: 'practice'
          })}><Message source="پرسیاری نوێ بەبێ یارمەتی" /></button>
        </div>}
      </>}

      {state.stage === 'practice' && <>
        <QuestionSet title={t("ڕاهێنانی سەربەخۆ — پرسیارە نوێکان")} questions={topic.practice} passage={topic.practicePassage} snapshot={state.practice} onAnswer={(id, answer) => answerSnapshot('practice', id, answer)} onSubmit={() => submitSnapshot('practice')} />
        {state.practice.completedAt && <>
          <p>{t(practiceScore.correct >= 2 ? 'لە ئەم هەوڵەدا ئامانجی ٢ لە ٣ت بەدەست هێنا. دووبارەکردنەوەی دواتر یارمەتیمان دەدات ببینین چی ماوەتەوە.' : 'ئەم هەوڵە دەڵێت هێشتا ڕاهێنان یارمەتیدەرە. هەڵەکان و ڕوونکردنەوەکان بە هێواشی ببینەوە؛ دەتوانیت داوای یارمەتی بکەیت.')}</p>
          {practiceScore.correct < 2 && <details>
            <summary><Message source="پێویستت بە یارمەتیی زیاترە؟ بنەما و نموونەکە دووبارە ببینەوە" /></summary>
            <h4><Message source="بنەمای بابەتەکە" /></h4><p>{t(topic.prerequisite)}</p>
            <h4>{t(topic.example.title)}</h4>
            <Passage>{t(topic.example.passage)}</Passage>
            <Expression>{t(topic.example.expression)}</Expression>
            <ol className="stack">{topic.example.steps.map((step, index) => <li key={index}><p>{t(step.text)}</p><Expression>{t(step.expression)}</Expression></li>)}</ol>
            <p className="muted"><Message source="هەوڵی یەکەم و ئەنجامەکەت هەر پاشەکەوت دەبن. ئەم پێداچوونەوەیە بۆ ڕوونکردنەوەیە؛ وەڵامە پێشووەکان ناگۆڕێت." /></p>
          </details>}
          <button type="button" className="btn btn-primary" onClick={() => update({
            stage: 'reflection'
          })}><Message source="بە وشەی خۆم ڕوونی دەکەمەوە" /></button>
        </>}
      </>}

      {state.stage === 'reflection' && <>
        <h3><Message source="بە وشەی خۆت ڕوونی بکەوە" /></h3>
        <label htmlFor={`reflection-${topic.id}`}>{t(topic.reflectionPrompt)}</label>
        <textarea className="input" id={`reflection-${topic.id}`} rows={6} maxLength={4000} value={state.reflection} onChange={event => update({
          reflection: event.target.value,
          reflectionChecked: false
        })} />
        <p className="muted"><Message source="ئەم نووسینە بە خۆکار نمرە نادرێت؛ درێژی نووسین پێوانەی تێگەیشتن نییە. بە پێی ئەم خاڵانە خۆت پێداچوونەوەی بۆ بکە، یان بە هەڵبژاردنی خۆت نیشانی مامۆستاکەت بدە." /></p>
        <ul>{topic.reflectionChecks.map(check => <li key={check}>{t(check)}</li>)}</ul>
        <label style={{
          display: 'flex',
          alignItems: 'start',
          gap: '0.5rem'
        }}><Message source="{p0} پێداچوونەوەم بە ڕوونکردنەوەکەم کرد؛ دەتوانم خاڵێکی نادیار بۆ پرسیارکردن دیاری بکەم." values={{
            p0: <input type="checkbox" checked={state.reflectionChecked} disabled={!state.reflection.trim()} onChange={event => update({
              reflectionChecked: event.target.checked
            })} />
          }} /></label>
        <button type="button" className="btn btn-primary" disabled={!state.reflection.trim() || !state.reflectionChecked} onClick={() => update({
          stage: 'followup'
        })}><Message source="پاشەکەوت و ئامادەبوون بۆ پشکنینی دواتر" /></button>
      </>}

      {state.stage === 'followup' && <>
        <h3><Message source="پشکنینی دواتر" /></h3>
        <p><Message source="لە {p0} بەدواوە، واتە لانیکەم ٢٤ کاتژمێر دوای ڕاهێنانی سەربەخۆ، سێ پرسیاری هاوشێوەی نوێ بەبێ بینینی نموونەکان تاقی بکەوە." values={{
            p0: t(formatDateTime(state.followupDueAt, locale))
          }} /></p>
        {due ? <QuestionSet title={t("چی لە بابەتەکە لەبیر ماوەتەوە؟")} questions={topic.followup} passage={topic.followupPassage} snapshot={state.followup} onAnswer={(id, answer) => answerSnapshot('followup', id, answer)} onConfidence={(id, confidence) => confidenceSnapshot('followup', id, confidence)} onSubmit={() => submitSnapshot('followup')} /> : <div className="empty-state"><p><Message source="کاتی پشکنینی دواتر هێشتا نەهاتووە. هەموو هەنگاوەکانت لەم ئامێرە پاشەکەوت دەبن؛ دەتوانیت بگەڕێیتەوە یان ئێستا بابەتێکی دیکە هەڵبژێریت." /></p><p className="muted"><Message source="ئەمە ئاگادارکردنەوەیەکی خۆکار نانێرێت؛ دەتوانیت لە خشتەی خۆت کاتی گەڕانەوە تۆمار بکەیت." /></p><button type="button" className="btn btn-secondary" onClick={() => setNow(Date.now())}><Message source="پشکنینی کاتی گەڕانەوە" /></button></div>}
      </>}

      {state.stage === 'complete' && <>
        <h3><Message source="بەراوردی دوو پشکنینەکە" /></h3>
        <div className="grid-two"><div className="panel"><strong><Message source="سەرەتا: {p0} لە {p1}" values={{
                p0: t(before.correct),
                p1: t(before.total)
              }} /></strong><p className="muted">{t(formatDateTime(state.baseline.completedAt, locale))}</p></div><div className="panel"><strong><Message source="دواتر: {p0} لە {p1}" values={{
                p0: t(after.correct),
                p1: t(after.total)
              }} /></strong><p className="muted">{t(formatDateTime(state.followup.completedAt, locale))}</p></div></div>
        <p>{t(after.correct > before.correct ? 'لەم سێ پرسیارە نوێیەدا وەڵامی ڕاستت زیاترە.' : after.correct === before.correct ? 'ژمارەی وەڵامە ڕاستەکان لە هەردوو پشکنینەکە یەکسانە.' : 'لەم سێ پرسیارە نوێیەدا وەڵامی ڕاستت کەمترە. بە هێواشی بڕوانە ئەو خاڵانەی پێویستیان بە ڕاهێنان هەیە.')}</p>
        <p className="muted"><Message source="پرسیارەکان هاوشێوەن، بەڵام هەمان پرسیار نین و تاقیکردنەوەی ستانداردکراو نین. ئەنجامەکە بە تەنها سەلماندنی هۆکاری گۆڕان یان پێوانەی توانای گشتی نییە. دڵنیایی، درێژی نووسین و کاتی خوێندن لەم بەراوردەدا نمرە نادرێن." /></p>
        {after.correct < 2 && <p><Message source="هێشتا ئامانجی ٢ لە ٣ لەم پشکنینەدا بەدەست نەهاتووە. هەڵەکان لەگەڵ مامۆستا یان کەسێکی یارمەتیدەر ببینەوە و ڕاهێنانی زیاتر هەڵبژێرە." /></p>}
        <details><summary><Message source="وەڵام و ڕوونکردنەوەی پشکنینی دواتر" /></summary><Passage>{t(topic.followupPassage)}</Passage>{topic.followup.map(question => <div key={question.id}><h4>{t(question.prompt)}</h4><Expression>{t(question.expression)}</Expression><AnswerFeedback question={question} answer={state.followup.answers[question.id]} /></div>)}</details>
        <details><summary><Message source="ڕوونکردنەوەی خۆت" /></summary><p style={{
            whiteSpace: 'pre-wrap'
          }}>{state.reflection}</p><p className="muted"><Message source="خۆپێداچوونەوەی قوتابییە؛ بە خۆکار هەڵسەنگاندنی تێگەیشتن نییە." /></p></details>
      </>}

      <div className="section-heading print:hidden" style={{
        flexWrap: 'wrap',
        marginTop: '1rem'
      }}>
        {onOpenPlan && <button type="button" className="btn btn-secondary" onClick={onOpenPlan}><Message source="بگەڕێوە بۆ پلانی خوێندن" /></button>}
        {onAskSupport && <button type="button" className="btn btn-secondary" onClick={onAskSupport}><Message source="پێویستم بە پشتگیرییە" /></button>}
      </div>
    </section>
  </div>;
}
