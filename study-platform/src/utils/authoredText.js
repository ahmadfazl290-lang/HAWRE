import { learningTopicById } from '../data/learningTopics.js';

// Only platform-authored fields carry a source tag. A typed field stays verbatim.
export const DEFAULT_SUBJECT = 'وانەیەکی هەڵبژێردراو';
export function canonicalField(record, field) {
  const tag = record?.sourceUI?.[field];
  if (field === 'subject' && tag === '@default') return DEFAULT_SUBJECT;
  const topic = learningTopicById[tag];
  if (!topic) return '';
  return field === 'subject' ? `${topic.subject} — ${topic.title}`.slice(0, 100) : field === 'goal' ? topic.goal : '';
}
export function cleanSourceUI(record, allowDefault = false) {
  const tags = {};
  for (const field of ['subject', 'goal']) {
    const canonical = canonicalField(record, field);
    if (canonical && canonical === record[field] && (allowDefault || record.sourceUI[field] !== '@default')) tags[field] = record.sourceUI[field];
  }
  return tags;
}
export function localizedField(record, field, t) {
  const canonical = canonicalField(record, field);
  if (!canonical || canonical !== record[field]) return record?.[field] || '';
  const tag = record.sourceUI[field];
  if (tag === '@default') return t(DEFAULT_SUBJECT);
  const topic = learningTopicById[tag];
  return field === 'subject' ? `${t(topic.subject)} — ${t(topic.title)}` : t(topic.goal);
}
