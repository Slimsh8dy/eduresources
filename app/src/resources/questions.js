import data from './questionData.json' with { type: 'json' };

export const QUESTION_TOPICS = data.topics.map(({ id, label }) => ({ id, label }));
export const PRACTICE_QUESTIONS = data.topics.flatMap(topic => topic.questions.map(question => ({ ...question, topic: topic.id, topicLabel: topic.label })));
export const SELF_REVIEW_CHECKLIST = data.checklist;
export const PRACTICE_NOTICE = data.notice;
export function plannerLink(question) {
  return `/philosophy-basics?question=${encodeURIComponent(question)}`;
}
export function normalizeQuestionTopic(topic) {
  const candidate = String(topic || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
  const aliases = { kant: 'kantianism', 'kantian-ethics': 'kantianism', 'natural-law-theory': 'natural-law' };
  const id = aliases[candidate] || candidate;
  return QUESTION_TOPICS.some(topic => topic.id === id) ? id : 'all';
}
