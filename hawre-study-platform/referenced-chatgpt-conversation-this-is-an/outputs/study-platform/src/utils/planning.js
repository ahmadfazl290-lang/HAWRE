/** Format calendar dates in the user's local timezone, without UTC conversion. */
export function localDate(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const candidate = new Date(year, month - 1, day, 12);
    return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day ? value : localDate();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDate(new Date());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(value, amount) {
  const [year, month, day] = localDate(value).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function displayDate(value, options = {}) {
  const [year, month, day] = localDate(value).split('-').map(Number);
  return new Intl.DateTimeFormat('ckb-IQ', { month: 'short', day: 'numeric', ...options })
    .format(new Date(year, month - 1, day, 12));
}

export const studyAreas = [
  'بەڕێوەبردنی کات',
  'سەرنجدان و ژینگەی خوێندن',
  'تێگەیشتن و شێوازی فێربوون',
  'پاڵنەر و فشاری دەروونی',
];

function scoreValues(scores) {
  return studyAreas.map((_, index) => {
    const value = Number(scores?.[index]);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  });
}

function stableId(text) {
  let value = 0;
  for (const character of text) value = ((value << 5) - value + character.codePointAt(0)) | 0;
  return Math.abs(value).toString(36);
}

/** A local, deterministic plan. It does not use a remote service or make diagnoses. */
export function createPlan(profile = {}, scores = [], startDate = localDate()) {
  const requestedMinutes = Number(profile.dailyMinutes);
  const dailyMinutes = Number.isFinite(requestedMinutes) ? Math.max(10, Math.min(180, Math.round(requestedMinutes))) : 30;
  const subject = String(profile.subject || '').trim() || 'وانەیەکی هەڵبژێردراو';
  const values = scoreValues(scores);
  const ranked = values.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score || a.index - b.index);
  const priorityIndex = ranked[0].index;
  const focusReason = ranked[0].score === ranked[3].score
    ? 'ئەم پلانە ڕێکخستنی کات، ڕاهێنان و پێداچوونەوە تێکەڵ دەکات. دەتوانیت بەپێی ئەزموونی ڕۆژانەت کاتەکان بگۆڕیت.'
    : `وەڵامەکانت لە بواری «${studyAreas[priorityIndex]}» پێویستییەکی زیاتر بە ڕاهێنان پیشان دەدەن؛ بۆیە هەنگاوەکان لەوێوە دەست پێ دەکەن.`;
  const quietTip = profile.environment === 'quiet'
    ? 'مۆبایلەکەت بێدەنگ بکە و تەنها کەرەستەی پێویست لەبەردەست بهێڵە.'
    : 'کاتێکی کەمتر ژاوەژاو هەڵبژێرە؛ ئەگەر دەکرێت داوا لە دەوروبەرت بکە ئەم ماوە کورتە بۆت بهێڵنەوە.';
  const templates = [
    [
      `لە ${subject} ئەرکێکی بچووک هەڵبژێرە، کاتی دەستپێکردنی بنووسە و دەستی پێ بکە.`,
      `قورسترین بەشی ${subject} بکە بە دوو هەنگاو؛ هەنگاوی یەکەم ئەمڕۆ تەواو بکە.`,
      `لە خشتەکەت کاتێکی گونجاو بۆ ${subject} دیاری بکە و تەنها یەک ئەرک بکە.`,
    ],
    [
      `${quietTip} پاشان یەک بەشی کورتی ${subject} بخوێنە.`,
      `پێش دەستپێکردنی ${subject} سەرنجڕاکێشەکان دوور بخەرەوە؛ ئەگەر بیرۆکەیەکی تر هات، لە کاغەزێک بینووسە.`,
      `لە ${subject} یەک ئەرک بەبێ گۆڕینی ئەپ یان وانە جێبەجێ بکە.`,
    ],
    [
      `بەشێکی کورتی ${subject} بخوێنە؛ کتێبەکە دابخە و بە زمانی خۆت ڕوونی بکەرەوە.`,
      `سێ پرسیار لە ${subject} بەبێ سەیرکردنی وەڵام تاقی بکەرەوە، پاشان هەڵەکانت بپشکنە.`,
      `لە ${subject} نموونەیەک چارەسەر بکە و هۆکاری هەر هەنگاوێک بنووسە.`,
    ],
    [
      `هەنگاوێکی ئاسانی ${subject} هەڵبژێرە و دەست پێ بکە؛ پێویست ناکات ئەمڕۆ هەمووی تەواو بکەیت.`,
      `بنووسە ${subject} چ پەیوەندییەکی بە ئامانجەکەت هەیە، پاشان ئەرکێکی بچووک جێبەجێ بکە.`,
      `بەشێکی ئاشنای ${subject} دووبارە بکەرەوە؛ ئەگەر گیرت خوارد، پرسیارێک بۆ مامۆستا یان هاوڕێیەک ئامادە بکە.`,
    ],
  ];
  const reviewTasks = [
    `بەبێ سەیرکردنی کتێب، دوو خاڵ لە ${subject} کە فێربوویت بنووسە؛ پاشان بپشکنە.`,
    `یەک پرسیاری پێشووی ${subject} دووبارە چارەسەر بکە و هەڵەیەکت تۆمار بکە.`,
    `بابەتێکی پێشووی ${subject} بە دەنگی خۆت ڕوون بکەرەوە و پرسیارێکی لێ دروست بکە.`,
  ];
  const reflectionTasks = [
    'یەک شتی سوودبەخش و یەک شتی قورس بنووسە؛ هەنگاوی داهاتووت دیاری بکە.',
    'ئەرکی داهاتوو ئامادە بکە و کاتێکی گونجاو بۆ دەستپێکردنی هەڵبژێرە.',
    'یەک پرسیار کە هێشتا ڕوون نییە بنووسە تا لە مامۆستا یان هاوڕێیەک بپرسی.',
  ];
  const tasks = [];
  const shortDays = dailyMinutes < 30 || Boolean(profile.works);
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(startDate, dayIndex);
    const category = dayIndex % 3 === 2 ? ranked[1].index : priorityIndex;
    const reflectionMinutes = shortDays ? 0 : Math.min(5, Math.max(2, Math.round(dailyMinutes * 0.1)));
    const reviewMinutes = Math.max(3, Math.round(dailyMinutes * (shortDays ? 0.3 : 0.25)));
    const primaryMinutes = dailyMinutes - reviewMinutes - reflectionMinutes;
    const dailyTasks = [
      { category, title: templates[category][dayIndex % 3], minutes: primaryMinutes, why: category === priorityIndex ? focusReason : `بۆ ڕاهێنانی بواری «${studyAreas[category]}» لە تەنیشت ئامانجی سەرەکی.` },
      { category: 2, title: reviewTasks[dayIndex % 3], minutes: reviewMinutes, why: 'بۆ ئەوەی خۆت بزانیت چی فێربوویت و کام بەش پێویستی بە دووبارەکردنەوە هەیە.' },
    ];
    if (!shortDays) dailyTasks.push({ category: 0, title: reflectionTasks[dayIndex % 3], minutes: reflectionMinutes, why: 'بۆ هەڵسەنگاندنی ئەزموونی ئەمڕۆ و ئاسانکردنی دەستپێکردنی داهاتوو.' });
    dailyTasks.forEach((task, slot) => tasks.push({ ...task, id: `${date}-${slot}-${stableId(task.title)}`, date, dayIndex, done: false }));
  }
  return { version: 1, startDate: localDate(startDate), dailyMinutes, subject, goal: String(profile.goal || '').trim(), priorityIndex, reason: focusReason, tasks, historyTasks: [], adjustedDates: [] };
}

/** Reduce only future unfinished tasks, at most once per check-in date. */
export function adaptFuturePlan(plan, date = localDate()) {
  if (!plan || !Array.isArray(plan.tasks) || (plan.adjustedDates || []).includes(date)) return plan;
  if (!plan.tasks.some(task => !task.done && task.date > date)) return plan;
  return {
    ...plan,
    adjustedDates: [...(plan.adjustedDates || []), date].slice(-60),
    tasks: plan.tasks.map(task => !task.done && task.date > date
      ? { ...task, minutes: Math.max(1, Math.floor(task.minutes * 0.75)), adjusted: true }
      : task),
  };
}

export function allPlanTasks(plan) {
  const tasks = [...(plan?.historyTasks || []), ...(plan?.tasks || [])];
  return [...new Map(tasks.filter(task => task && typeof task.id === 'string').map(task => [task.id, task])).values()];
}
