import { useI18n, Message } from "../i18n/LocaleProvider.jsx";
import { requiresExtraText } from '../utils/validation.js';
export default function QuestionsForm({
  currentSection,
  currentQuestions,
  answers,
  extraTexts,
  setExtraTexts,
  handleAnswer,
  handlePrev,
  handleNext,
  step,
  canProceed
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return <div className="space-y-5">
            <div className={`rounded-[24px] border-2 ${currentSection.border} ${currentSection.bg} p-6 flex gap-4 shadow-sm`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentSection.gradient} text-white flex items-center justify-center text-2xl shadow-lg`}>{t(currentSection.icon)}</div>
              <div>
                <h2 className="text-[22px] font-extrabold text-slate-900">{t(currentSection.title)}</h2>
                <p className="text-[14px] text-slate-600 mt-1"><Message source="{p0} — تکایە بە وردی وەڵام بدەرەوە" values={{
            p0: t(currentSection.desc)
          }} /></p>
              </div>
            </div>

            <div className="grid gap-5">
              {currentQuestions.map(q => <div key={q.id} className="rounded-[20px] bg-white/80 backdrop-blur border border-slate-200 shadow-sm p-6">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[12px] font-bold">{t(q.id.replace('q', ''))}</div>
                    <h3 className="text-[16px] font-bold text-slate-800 leading-7">{t(q.text)}</h3>
                  </div>
                  <div className="mt-5">
                    {q.type === "radio" && <div className="grid gap-2.5">
                        {q.options.map(opt => {
              const selected = answers[q.id] === opt;
              return <button type="button" aria-pressed={selected} key={opt} onClick={() => handleAnswer(q.id, opt)} className={`text-right w-full rounded-2xl border-2 px-4 py-3.5 text-[14px] font-medium flex justify-between ${selected ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'}`}>
                              <span>{t(opt)}</span><span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-white border-white' : 'border-slate-300 bg-white'}`}>{selected && <span className="w-2 h-2 rounded-full bg-slate-900" />}</span>
                            </button>;
            })}
                      </div>}
                    {q.type === "select" && <select aria-label={t(q.text)} required value={answers[q.id] || ""} onChange={e => handleAnswer(q.id, e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-[14px]">
                        <option value="" disabled><Message source="— هەڵبژێرە —" /></option>
                        {q.options.map(o => <option key={o} value={o}>{t(o)}</option>)}
                      </select>}
                    {q.type === "slider" && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {q.options.map(opt => {
              const selected = answers[q.id] === opt;
              return <button type="button" aria-pressed={selected} key={opt} onClick={() => handleAnswer(q.id, opt)} className={`rounded-2xl border-2 px-3 py-3 text-[13px] font-semibold ${selected ? `bg-gradient-to-br ${currentSection.gradient} text-white border-transparent shadow-md` : 'bg-white border-slate-200 text-slate-600'}`}>{t(opt)}</button>;
            })}
                      </div>}
                    {(q.type === "textarea" || q.type === "textarea-big") && <textarea aria-label={t(q.text)} required value={answers[q.id] || ""} onChange={e => handleAnswer(q.id, e.target.value)} placeholder={t(q.placeholder)} rows={q.type === "textarea-big" ? 4 : 2} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[14px] focus:border-slate-900 outline-none" />}
                    {q.type === "radio-text" && <div className="space-y-3">
                        <div className="grid gap-2">
                          {q.options.map(opt => {
                const selected = answers[q.id] === opt;
                return <button type="button" aria-pressed={selected} key={opt} onClick={() => handleAnswer(q.id, opt)} className={`text-right w-full rounded-2xl border-2 px-4 py-3 text-[14px] flex justify-between ${selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200'}`}>{t(opt)}</button>;
              })}
                        </div>
                        <input aria-label={t(q.placeholder)} required={requiresExtraText(q, answers[q.id])} value={extraTexts[q.id + "_extra"] || ""} onChange={e => setExtraTexts(prev => ({
              ...prev,
              [q.id + "_extra"]: e.target.value
            }))} placeholder={t(q.placeholder)} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[14px]" />
                      </div>}
                  </div>
                </div>)}
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button onClick={handlePrev} disabled={step === 0} className={`px-6 py-3 rounded-2xl font-bold text-[14px] border-2 ${step === 0 ? 'border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}><Message source="⬅️ پێشوو" /></button>
              <button onClick={handleNext} disabled={!canProceed} className="disabled:opacity-40 disabled:cursor-not-allowed px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold text-[14px] shadow-lg"><Message source="دواتر ➡️" /></button>
            </div>
          </div>;
}
