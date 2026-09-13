import { FLASHCARDS, LOGIC_PROBLEMS } from '../learning/content.js';

// Reviewed study excerpts used to ground tutor answers. Shared by the site and the
// Cloudflare Worker so both refer to the same catalogue ids and the same texts.
export const REVIEWED_EXCERPTS = [
  ...FLASHCARDS.map(card => ({ resourceId: 'tool-flashcards', title: `${card.concept} — ${card.thinker}`, text: card.definition })),
  ...LOGIC_PROBLEMS.map(problem => ({ resourceId: 'tool-logic-practice', title: problem.title, text: typeof problem.solution === 'string' ? problem.solution : JSON.stringify(problem.solution) })),
];
