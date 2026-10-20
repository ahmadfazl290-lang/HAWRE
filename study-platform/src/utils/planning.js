import { cleanSourceUI, DEFAULT_SUBJECT } from './authoredText.js';

/** Calendar dates stay local; do not convert a student's day through UTC. */
export function localDate(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const candidate = new Date(year, month - 1, day, 12);
    return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day ? value : localDate();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(value, amount) {
  const [year, month, day] = localDate(value).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function displayDate(value, options = {}, locale = 'ckb') {
  const [year, month, day] = localDate(value).split('-').map(Number);
  const d = new Date(year, month - 1, day, 12);
  const intl={ckb:'ckb-IQ',kmr:'ku-Latn',ar:'ar-IQ',en:'en-GB',fa:'fa-IR'}[locale]||'ckb-IQ';
  if (Intl.DateTimeFormat.supportedLocalesOf([intl]).length) return new Intl.DateTimeFormat(intl, { month: 'short', day: 'numeric', ...options }).format(d);
  if (locale === 'kmr') {
    const weekdays = ['Yekşem','Duşem','Sêşem','Çarşem','Pêncşem','În','Şemî'];
    return `${options.weekday ? weekdays[d.getDay()]+', ' : ''}${year}/${month}/${day}`;
  }
  const weekdays = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
  return `${options.weekday ? weekdays[d.getDay()]+'، ' : ''}${year}/${month}/${day}`.replace(/\d/g,n=>'٠١٢٣٤٥٦٧٨٩'[n]);
}

export const studyAreas = [
  'بەڕێوەبردنی کات', 'سەرنجدان و ژینگەی خوێندن',
  'تێگەیشتن و شێوازی فێربوون', 'پاڵنەر و فشاری دەروونی',
];

export const supportReasons = [
  { id: 'understanding', label: 'لە بابەتەکە تێنەگەیشتم' },
  { id: 'starting', label: 'دەستپێکردن قورس بوو' },
  { id: 'time', label: 'کاتم کەم بوو' },
  { id: 'environment', label: 'شوێن و سەرنجڕاکێشەکان ڕێگر بوون' },
  { id: 'tired', label: 'ماندوو بووم و پێویستم بە پشوو بوو' },
];

export function supportForReason(reason) {
  const guidance = {
    understanding: {
      title: 'لە شوێنی گیرخواردنەکە دەست پێ بکە',
      steps: ['بنووسە لە کام هەنگاو یان وشە تێنەگەیشتوویت؛ تەنها بەشێکی بچووک هەڵبژێرە.', 'بابەتە پێشەکییەکە بپشکنە: بۆ ئەم بەشە پێویستە پێشتر چی بزانیت؟', 'نموونەیەکی ڕوونکراو ببینە، پاشان نموونەیەکی هاوشێوە خۆت تاقی بکەرەوە.', 'ئەگەر هێشتا ناڕوونە، هەنگاوەکە و پرسیارەکەت بۆ مامۆستا یان هاوڕێیەک ئامادە بکە.'],
      actionLabel: 'ڕێڕەوی فێربوون بکەرەوە', action: 'learning',
    },
    starting: {
      title: 'تەنها یەک دەستپێکی بچووک',
      steps: ['کتێب یان کاغەزەکەت ئامادە بکە و لاپەڕەی پێویست بکەرەوە.', 'ئەرکەکە بکە بە هەنگاوێکی دوو خولەکی؛ وەک خوێندنەوەی یەک پرسیار.', 'دوای ئەو هەنگاوە بڕیار بدە بەردەوام بیت یان کاتێکی گونجاوتر هەڵبژێریت.'],
      actionLabel: 'ئامرازی دەستپێکردن بکەرەوە', action: 'tools',
    },
    time: {
      title: 'پلانەکە لە کاتە بەردەستەکەتدا بگونجێنە',
      steps: ['یەک ئەرکی پێویستتر هەڵبژێرە؛ ئەرکەکانی تر بۆ کاتێکی گونجاو بگوازەرەوە.', 'کاتی ئەرکە نەتەواوەکانی ڕۆژانی داهاتوو نزیکەی چارەکێک کەم دەکرێتەوە؛ هەر ڕۆژ تەنها جارێک.', 'کاتێکی کەم و گونجاو هەڵبژێرە؛ زیادکردنی هەمیشەیی کات ئامانجی پلانەکە نییە.'],
      actionLabel: 'ئامرازەکانی ڕێکخستنی کات', action: 'tools',
    },
    environment: {
      title: 'ژینگەکە بە شتێکی بەردەست باشتر بکە',
      steps: ['یەک سەرنجڕاکێش دیاری بکە: دەنگ، مۆبایل، هاتوچۆ یان شتێکی تر.', 'ئەگەر دەکرێت ئاگادارکردنەوەکان بێدەنگ بکە، یان کاتێکی کەمتر ژاوەژاو هەڵبژێرە.', 'ئەگەر شوێنی تایبەت نییە، بە کاغەز و ئەرکێکی کورت کار بکە و لە دەوروبەرت داوای ماوەیەکی کورت بکە.'],
      actionLabel: 'ئامرازەکانی خوێندن', action: 'tools',
    },
    tired: {
      title: 'پشوو و کاتی گونجاوتر هەڵبژێرە',
      steps: ['پێش هەوڵی زیاتر ماوەیەک پشوو بدە؛ دەتوانیت ئەرکەکە بۆ کاتێکی گونجاوتر بهێڵیتەوە.', 'کاتی ئەرکە نەتەواوەکانی ڕۆژانی داهاتوو نزیکەی چارەکێک کەم دەکرێتەوە؛ هەر ڕۆژ تەنها جارێک.', 'کاتێک گەڕایتەوە، بە ئەرکێکی بچووک دەست پێ بکە و بەپێی توانای ئەو ڕۆژە ڕێکی بخە.'],
      actionLabel: 'کاتژمێر و پشوو', action: 'tools',
    },
  };
  return guidance[reason] || null;
}

function stableId(text) {
  let hash = 0;
  for (const character of text) hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

/** A deterministic local plan, with no remote service or clinical inference. */
export function createPlan(profile = {}, scores = [], startDate = localDate()) {
  const requested = Number(profile.dailyMinutes);
  const dailyMinutes = Number.isFinite(requested) && requested > 0 ? Math.max(10, Math.min(180, Math.round(requested))) : 30;
  const subject = String(profile.subject || '').trim() || DEFAULT_SUBJECT;
  const sourceUI = cleanSourceUI(profile);
  if (!String(profile.subject || '').trim()) sourceUI.subject = '@default';
  const values = studyAreas.map((_, index) => Number.isFinite(Number(scores?.[index])) ? Math.max(0, Math.min(100, Number(scores[index]))) : 0);
  const ranked = values.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score || a.index - b.index);
  const priorityIndex = ranked[0].index;
  const reason = ranked[0].score === ranked[3].score
    ? 'پلانەکە ڕێکخستنی کات، ڕاهێنان و پێداچوونەوە تێکەڵ دەکات. بەپێی ئەزموونی خۆت هەنگاو و کاتەکان بگۆڕە.'
    : `بەپێی وەڵامەکانت، «${studyAreas[priorityIndex]}» لە پێشینەی پشتیوانیدایە؛ بۆیە پلانەکە ڕاهێنانی زیاتر بۆ ئەو بوارە هەیە.`;
  const environmentTip = profile.environment === 'quiet'
    ? 'مۆبایلەکەت بێدەنگ بکە و تەنها کەرەستەی پێویست لەبەردەست بهێڵە.'
    : 'کاتێکی کەمتر ژاوەژاو هەڵبژێرە؛ ئەگەر دەکرێت لە دەوروبەرت داوای ماوەیەکی کورت بکە.';
  const templates = [
    [`لە ${subject} ئەرکێکی بچووک هەڵبژێرە، کاتی دەستپێکردنی بنووسە و دەستی پێ بکە.`, `بەشێکی ${subject} بکە بە دوو هەنگاو؛ هەنگاوی یەکەم ئەمڕۆ تەواو بکە.`, `لە خشتەکەت کاتێکی گونجاو بۆ ${subject} دیاری بکە و تەنها یەک ئەرک بکە.`],
    [`${environmentTip} پاشان یەک بەشی کورتی ${subject} بخوێنە.`, `پێش دەستپێکردنی ${subject} سەرنجڕاکێشێک دوور بخەرەوە؛ بیرۆکەی تریش هات، لە کاغەزێک بینووسە.`, `لە ${subject} یەک ئەرک بەبێ گۆڕینی ئەپ یان وانە جێبەجێ بکە.`],
    [`بەشێکی کورتی ${subject} بخوێنە؛ کتێبەکە دابخە و بە زمانی خۆت ڕوونی بکەرەوە.`, `سێ پرسیار لە ${subject} بەبێ سەیرکردنی وەڵام تاقی بکەرەوە، پاشان هەڵەکانت بپشکنە.`, `لە ${subject} نموونەیەک چارەسەر بکە و هۆکاری هەر هەنگاوێک بنووسە.`],
    [`هەنگاوێکی ئاسانی ${subject} هەڵبژێرە؛ پێویست ناکات ئەمڕۆ هەمووی تەواو بکەیت.`, `بنووسە ${subject} چ پەیوەندییەکی بە ئامانجەکەت هەیە، پاشان ئەرکێکی بچووک جێبەجێ بکە.`, `بەشێکی ئاشنای ${subject} دووبارە بکەرەوە؛ گیرت خوارد، پرسیارێک بۆ مامۆستا یان هاوڕێیەک ئامادە بکە.`],
  ];
  const reviews = [`بەبێ سەیرکردنی کتێب، دوو خاڵ لە ${subject} بنووسە؛ پاشان بپشکنە.`, `پرسیارێکی پێشووی ${subject} دووبارە چارەسەر بکە و هەڵەیەکت تۆمار بکە.`, `بابەتێکی پێشووی ${subject} ڕوون بکەرەوە و پرسیارێکی لێ دروست بکە.`];
  const reflections = ['یەک شتی سوودبەخش و یەک شتی قورس بنووسە؛ هەنگاوی داهاتووت دیاری بکە.', 'ئەرکی داهاتوو ئامادە بکە و کاتێکی گونجاو بۆ دەستپێکردنی هەڵبژێرە.', 'یەک پرسیاری ناڕوون بنووسە تا لە مامۆستا یان هاوڕێیەک بپرسی.'];
  const tasks = [];
  const shortDays = dailyMinutes < 30 || Boolean(profile.works);
  const safeStart = localDate(startDate);
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(safeStart, dayIndex);
    const category = dayIndex % 3 === 2 ? ranked[1].index : priorityIndex;
    const reflectionMinutes = shortDays ? 0 : Math.min(5, Math.max(2, Math.round(dailyMinutes * 0.1)));
    const reviewMinutes = Math.max(3, Math.round(dailyMinutes * (shortDays ? 0.3 : 0.25)));
    const dailyTasks = [
      { category, title: templates[category][dayIndex % 3], minutes: dailyMinutes - reviewMinutes - reflectionMinutes, why: category === priorityIndex ? reason : `بۆ ڕاهێنانی «${studyAreas[category]}» لە تەنیشت ئامانجی سەرەکی.` },
      { category: 2, title: reviews[dayIndex % 3], minutes: reviewMinutes, why: 'بۆ ئەوەی خۆت بزانیت چی فێربوویت و کام بەش پێویستی بە پێداچوونەوە هەیە.' },
    ];
    if (!shortDays) dailyTasks.push({ category: 0, title: reflections[dayIndex % 3], minutes: reflectionMinutes, why: 'بۆ هەڵسەنگاندنی ئەزموونی ئەمڕۆ و ئاسانکردنی دەستپێکردنی داهاتوو.' });
    dailyTasks.forEach((task, slot) => tasks.push({ ...task, id: `${date}-${slot}-${stableId(task.title)}`, date, dayIndex, done: false }));
  }
  return { version: 2, startDate: safeStart, dailyMinutes, subject, goal: String(profile.goal || '').trim(), sourceUI, priorityIndex, reason, tasks, historyTasks: [], adjustedDates: [] };
}

/** Only lack of time/tiredness reduces time. Other difficulties need a different response. */
export function adaptFuturePlan(plan, date = localDate(), supportReason) {
  if (!['time', 'tired'].includes(supportReason) || !plan || !Array.isArray(plan.tasks) || (plan.adjustedDates || []).includes(date)) return plan;
  if (!plan.tasks.some(task => !task.done && task.date > date)) return plan;
  return {
    ...plan,
    adjustedDates: [...(plan.adjustedDates || []), date].slice(-60),
    tasks: plan.tasks.map(task => !task.done && task.date > date ? { ...task, minutes: Math.max(1, Math.floor(task.minutes * 0.75)), adjusted: true } : task),
  };
}

export function allPlanTasks(plan) {
  const tasks = [...(Array.isArray(plan?.historyTasks) ? plan.historyTasks : []), ...(Array.isArray(plan?.tasks) ? plan.tasks : [])];
  return [...new Map(tasks.filter(task => task && typeof task.id === 'string').map(task => [task.id, task])).values()];
}
