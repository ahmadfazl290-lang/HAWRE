// A small, explicit local scheduling rule, not an assessment of mastery.
const INTERVALS = [1, 3, 7, 14, 30];

export function localReviewDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function addReviewDays(value, days) {
  const date = parseLocalDate(value) || new Date();
  const count = Number.isFinite(Number(days)) ? Math.min(365, Math.max(0, Math.floor(Number(days)))) : 0;
  date.setDate(date.getDate() + count);
  return localReviewDate(date);
}

export function isReviewDue(value, today = localReviewDate()) {
  return !parseLocalDate(value) || value <= today;
}

export function sortCardsForReview(cards, today = localReviewDate()) {
  return [...cards].sort((first, second) => {
    const dueFirst = Number(isReviewDue(second.dueDate, today)) - Number(isReviewDue(first.dueDate, today));
    return dueFirst || String(first.dueDate || '').localeCompare(String(second.dueDate || ''));
  });
}

export function reviewCard(card, grade, today = localReviewDate()) {
  const previous = Math.min(30, Math.max(0, Number(card.intervalDays) || 0));
  const intervalDays = grade === 'known' ? (INTERVALS.find((interval) => interval > previous) || 30) : 0;
  return {
    ...card,
    status: grade === 'known' ? 'known' : 'review',
    intervalDays,
    attempts: Math.min(1_000_000, Math.max(0, Math.floor(Number(card.attempts) || 0)) + 1),
    lastReviewed: today,
    dueDate: addReviewDays(today, intervalDays),
  };
}
