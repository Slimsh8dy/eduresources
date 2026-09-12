export const STORAGE_VERSION = 1;
export const STORAGE_KEYS = Object.freeze({
  essay: 'eduresources.learning.essay.v1',
  cards: 'eduresources.learning.cards.v1',
  logic: 'eduresources.learning.logic.v1',
});

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isTextRecord = value => isRecord(value) && Object.values(value).every(item => typeof item === 'string');
export const isReviewRecord = value => isRecord(value) && Object.values(value).every(item => ['again', 'unsure', 'confident'].includes(item));
export const isEssayDraft = value => isRecord(value) && isTextRecord(value.fields) && Number.isInteger(value.step) && value.step >= 0 && ['guided', 'outline'].includes(value.mode);
export const isLogicAttempts = value => isRecord(value) && Object.values(value).every(item => isRecord(item) && typeof item.answer === 'string' && typeof item.revision === 'string' && typeof item.revealed === 'boolean');

export function readSaved(storage, key, initial, validate) {
  if (!storage) return {data: initial, status: 'unavailable'};
  let raw;
  try {
    raw = storage.getItem(key);
  } catch { return {data: initial, status: 'unavailable'}; }
  if (raw === null) return {data: initial, status: 'ready'};
  try {
    const saved = JSON.parse(raw);
    if (!isRecord(saved) || saved.version !== STORAGE_VERSION || !validate(saved.data)) return {data: initial, status: 'corrupt'};
    return {data: saved.data, status: 'saved'};
  } catch { return {data: initial, status: 'corrupt'}; }
}

export function writeSaved(storage, key, data) {
  try {
    if (!storage) return 'unavailable';
    storage.setItem(key, JSON.stringify({version: STORAGE_VERSION, data, updatedAt: new Date().toISOString()}));
    return 'saved';
  } catch { return 'unavailable'; }
}

export function makeEssayText(fields, steps) {
  const completed = steps.filter(step => (fields[step.id] || '').trim()).length;
  return `PHILOSOPHY ESSAY PLAN\n${completed}/${steps.length} prompts completed${completed < steps.length ? ' — DRAFT / INCOMPLETE' : ''}\n\n` + steps.map(step => `${step.section} — ${step.label}\n${fields[step.id]?.trim() || '[Not yet completed]'}\n`).join('\n');
}

export function matchingCards(cards, topic = 'all', reviews = {}, queueOnly = false) {
  const aliases = {kant: 'kantianism', utilitarian: 'utilitarianism'};
  const filter = aliases[topic] || topic;
  return cards.filter(card => (filter === 'all' || card.tag === filter) && (!queueOnly || ['again', 'unsure'].includes(reviews[card.id])));
}

// WebLLM's structured-output grammar constrains field types. The validator below
// separately enforces lengths and premise labels; grammar is not a correctness check.
export const LOGIC_PROBLEM_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    title: {type: 'string'},
    argument: {type: 'array', items: {type: 'string'}, minItems: 3, maxItems: 6},
    question: {type: 'string'},
    hint: {type: 'string'},
    solution: {type: 'string'},
  },
  required: ['title', 'argument', 'question', 'hint', 'solution'],
  additionalProperties: false,
});

const LOGIC_GENERATION_SYSTEM = `Create one short philosophy logic exercise, not a grade or assessment of a learner. Return only the requested JSON object. The fields title, question, hint and solution must each be ONE plain string, never an object or list. Only argument is an array: two to five strings labelled P1:, P2:, etc., followed by one string labelled C:.
Keep the title neutral so it does not reveal the answer. Ask about validity and soundness separately. In solution, explain the inference using the actual premises. For an invalid argument give a matching case with true premises and a false conclusion. For a valid argument explain why the premises force the conclusion. Do not claim soundness without establishing the premises' truth. Treat philosophical disputes as disputed. Use 90–150 words in solution; no HTML or invented sources.
Example of the required structure (create a different example):
{"title":"A locked cabinet","argument":["P1: If the cabinet is locked, its door cannot open.","P2: The cabinet is locked.","C: Its door cannot open."],"question":"Is the inference valid? What else is required for soundness?","hint":"Assume both premises are true, then test whether the conclusion could be false.","solution":"The form is modus ponens: if P then Q; P; therefore Q. It is valid, since both premises cannot be true while the conclusion is false. Soundness additionally requires the premises to be true. The stated argument supplies the premises but does not independently establish their truth. We would need grounds for accepting both the connection between being locked and being unable to open, and the claim that this cabinet is locked."}`;

export function buildLogicGenerationRequest(difficulty) {
  const descriptions = {
    easy: 'Use exactly two premises and a conclusion, with one clear conditional form: modus ponens, modus tollens, affirming the consequent, or denying the antecedent.',
    moderate: 'Use three premises and a conclusion. Include one clear questionable assumption or informal fallacy. Explain whether the conclusion follows from the premises separately from whether that assumption is justified.',
    hard: 'Use a short chain of conditionals or a categorical argument. Reconstruct the precise form and give either a derivation or a counterexample. Keep the philosophical interpretation focused on one issue.',
  };
  if (!descriptions[difficulty]) throw new Error('Choose an available problem difficulty.');
  return {
    system: LOGIC_GENERATION_SYSTEM,
    prompt: `Create one ${difficulty} exercise. ${descriptions[difficulty]} Use a new everyday or philosophical example, not the locked cabinet, Socrates, cats being reptiles, rain and wet ground, or studying and passing an exam. Make the question, hint and solution agree. Keep solution as a single plain string.`,
    maxTokens: 1400,
    responseFormat: {type: 'json_object', schema: JSON.stringify(LOGIC_PROBLEM_SCHEMA)},
  };
}

// Parse exactly one JSON object. Strip only a surrounding Markdown fence; never evaluate model output.
export function validateGeneratedProblem(raw) {
  if (typeof raw !== 'string' || raw.length > 30000) throw new Error('The generated problem was not a readable text response.');
  let value;
  try { value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('The generated response was not valid JSON. Please try again.'); }
  if (!isRecord(value)) throw new Error('The generated response must be one problem.');
  const limits = {title: 160, question: 1800, hint: 1800, solution: 16000};
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > limit) throw new Error(`The generated problem has an invalid ${field}.`);
  }
  if (!Array.isArray(value.argument) || value.argument.length < 3 || value.argument.length > 6 || value.argument.some(line => typeof line !== 'string' || !line.trim() || line.length > 1200)) throw new Error('The problem needs two to five premises and one conclusion.');
  if (!/^C:\s*\S/.test(value.argument.at(-1)) || value.argument.slice(0, -1).some((line, i) => !new RegExp(`^P${i + 1}:\\s*\\S`).test(line))) throw new Error('The premises and conclusion were not labelled correctly.');
  return Object.fromEntries(['title', 'question', 'hint', 'solution', 'argument'].map(field => [field, value[field]]));
}

export function isGeneratedProblemList(value) {
  const allowed = new Set(['title', 'question', 'hint', 'solution', 'argument', 'id', 'difficulty', 'isAI']);
  if (!Array.isArray(value)) return false;
  return value.every(problem => {
    try {
      validateGeneratedProblem(JSON.stringify(problem));
      return typeof problem.id === 'string' && /^ai-[a-zA-Z0-9-]+$/.test(problem.id) && ['easy', 'moderate', 'hard'].includes(problem.difficulty) && problem.isAI === true && Object.keys(problem).every(key => allowed.has(key));
    } catch { return false; }
  });
}
