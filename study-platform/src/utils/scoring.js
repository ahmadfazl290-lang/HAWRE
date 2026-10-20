import {questions} from '../data/questions.js';
export const SCORING_VERSION='support-v2';
// These ordinal rules summarize direct self-reports, not diagnoses or probabilities.
// Duration, environment, help-seeking preference and free text are context only.
export const supportRules={q2:[0,2,1],q3:[2,1,0],q6:[2,0,0,0],q7:[2,1,0],q9:[2,1,0],q12:[2,1,0],q14:[2,1,0],q15:[0,2,1,1],q16:[2,1,0]};
export function scoreForAnswer(id,value){const q=questions.find(q=>q.id===id),rules=supportRules[id];return q&&rules&&q.options.includes(value)?rules[q.options.indexOf(value)]:null;}
export function calculateScores(answers){return [0,1,2,3].map(section=>{const values=questions.filter(q=>q.section===section).map(q=>scoreForAnswer(q.id,answers[q.id])).filter(v=>v!==null);return values.length?Math.round(values.reduce((s,n)=>s+n,0)/(2*values.length)*100):0;});}
export function supportBand(score){return score>=65?'پشتگیریی زیاتر':score>=35?'پشتگیریی مامناوەند':'پشتگیریی کەمتر';}
export function supportReasons(answers,section){return questions.filter(q=>q.section===section&&scoreForAnswer(q.id,answers[q.id])>0).map(q=>({question:q.text,answer:answers[q.id]}));}
export function getRecommendations(idx, score) {
    const recs = {
      0: {
        high: ["خشتەیەکی ڕۆژانە دروست بکە: بۆ نموونە ٦-٨ ئێوارە تەنها بۆ خوێندن", "تەکنیکی پۆمۆدۆرۆ بەکاربهێنە: ٢٥ خولەک بخوێنە، ٥ خولەک پشوو وەربگرە", "هەموو بەیانییەک ٣ گرنگترین ئەرکت بنووسە", "کاتەکانی مۆبایل سنووردار بکە لە کاتی خوێندن"],
        medium: ["هەوڵ بدە خشتەکەت ڕۆژانە دووبارە بکەیتەوە", "کاتژمێرێکی دیاریکراو بۆ هەموو وانەکان دابنێ", "لیستی ئەرکەکان بەکاربهێنە"],
        low: ["زۆر باشە! بەردەوام بە لەسەر خشتە ڕێکخراوەکەت", "ئەم خشتەیە لەگەڵ هاوڕێیەکانتدا باس بکەیت بۆ هاندان"]
      },
      1: {
        high: ["شوێنێکی تایبەت و هێمن بۆ خوێندن دیاری بکە", "مۆبایلەکەت بخەرە ژوورێکی تر یان بیخەرە سەر دۆخی فڕۆکە", "گوێچکەی دژە دەنگ یان میوزیکی هێمن بەکاربهێنە", "هەر ٣٠ خولەک جارێک ٢ خولەک هەناسەی قووڵ بدە"],
        medium: ["پێش خوێندن ٥ خولەک مێزەکەت ڕێکبخە", "ئاگادارکردنەوەکانی مۆبایل ببەستە", "تەکنیکی ٢٥-٥ تاقی بکەرەوە"],
        low: ["لە وەڵامەکانتدا پچڕانی سەرنجی کەمترت ڕاپۆرت کردووە؛ ئەو ڕێگایانەی یارمەتیت دەدەن بەردەوام بکە", "ئەگەر شوێنەکەت ژاوەژاوە، هێشتا دەتوانیت کاتێکی گونجاوتر هەڵبژێریت"]
      },
      2: {
        high: ["لە جیاتی لەبەرکردن، بابەتەکە بە وشەی خۆت ڕوون بکەرەوە", "نەخشەی زەینی (Mind Map) بۆ هەر بابەتێک دروست بکە", "کاتێک تێناگەی، دەستبەجێ پرسیار بکە", "هەموو ڕۆژێک ١٠ خولەک دووبارەکردنەوە بکە"],
        medium: ["تێکەڵەیەک لە تێگەیشتن و لەبەرکردن بەکاربهێنە", "ڤیدیۆی کورت لە یوتیوب ببینە", "لەگەڵ هاوڕێکانتدا گروپی خوێندن دروست بکە"],
        low: ["لە وەڵامەکانتدا قورسایی کەمترت لە تێگەیشتن و بیرخستنەوە ڕاپۆرت کردووە؛ بە ڕاهێنانیش تاقی بکەرەوە", "یارمەتی هاوڕێکانت بدە کە کێشەیان هەیە"]
      },
      3: {
        high: ["ئامانجێکی بچووک و ڕوون بنووسە: 'دەمەوێت ببم بە...'", "لەگەڵ کەسێکی متمانەپێکراو قسە بکە دەربارەی فشارەکانت", "ڕۆژانە ٥ خولەک وەرزشی سووک یان پیاسە بکە", "بیرت بێت: نمرە تەنها ژمارەیەکە، هەوڵدانەکەت گرنگترە"],
        medium: ["هەموو ئێوارەیەک ٣ شت بنووسە کە فێری بوویت", "کات بۆ خولیاکانت تەرخان بکە", "لەگەڵ خێزانەکەت قسە بکە کە پێویستت بە هاندانە نەک فشار"],
        low: ["لە وەڵامەکانتدا فشار و بێحەزیی کەمترت ڕاپۆرت کردووە؛ بارودۆخیش دەتوانێت بگۆڕێت", "ئامانجەکانت لە شوێنێک هەڵبواسە بۆ ئەوەی هەموو ڕۆژ بیبینیت"]
      },
    };
    if (score >= 65) return recs[idx].high;
    if (score >= 35) return recs[idx].medium;
    return recs[idx].low;
  }
