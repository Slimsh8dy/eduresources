import test from 'node:test';
import assert from 'node:assert/strict';
import {LOGIC_PROBLEMS, FLASHCARDS, ESSAY_STEPS} from '../app/src/learning/content.js';
import {STORAGE_KEYS, readSaved, writeSaved, isEssayDraft, isReviewRecord, isLogicAttempts, makeEssayText, matchingCards, validateGeneratedProblem, isGeneratedProblemList, LOGIC_PROBLEM_SCHEMA, buildLogicGenerationRequest} from '../app/src/learning/state.mjs';

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data};
}

test('all existing teaching items retain stable identities, and synthesis is added', () => {
  assert.deepEqual(LOGIC_PROBLEMS.map(problem => problem.id), Array.from({length: 12}, (_, i) => i + 1));
  assert.deepEqual(FLASHCARDS.map(card => card.id), Array.from({length: 30}, (_, i) => i + 1));
  assert.equal(ESSAY_STEPS.length, 25);
  assert.equal(new Set(ESSAY_STEPS.map(step => step.id)).size, 25);
  assert.equal(ESSAY_STEPS.at(-1).id, 'final_synthesis');
  for (const problem of LOGIC_PROBLEMS) {
    assert.ok(problem.checklist.length >= 3);
    assert.ok(problem.sources.length > 0);
    for (const source of problem.sources) assert.equal(new URL(source.url).protocol, 'https:');
  }
});

test('editorial corrections retain unambiguous labels and traceable sources', () => {
  const illicit = LOGIC_PROBLEMS.find(problem => problem.id === 12);
  assert.equal(illicit.title, 'The Illicit Major Fallacy');
  assert.match(illicit.solution, /distributed in the conclusion but not in its premise/);
  assert.match(LOGIC_PROBLEMS.find(problem => problem.id === 8).solution, /does not include a separate requirement/);
  assert.match(LOGIC_PROBLEMS.find(problem => problem.id === 10).solution, /remain supertrue/);
  assert.match(LOGIC_PROBLEMS.find(problem => problem.id === 11).solution, /Q without P/);
  assert.ok(FLASHCARDS.find(card => card.id === 24).sources[0].url.includes('cambridge.org'));
});

test('versioned drafts survive a fresh reader, including special characters', () => {
  const storage = memoryStorage();
  const draft = {fields: {essay_q: 'A & B <script> "quote"', thesis: 'Duty\nReason'}, step: 24, mode: 'outline'};
  assert.equal(writeSaved(storage, STORAGE_KEYS.essay, draft), 'saved');
  assert.deepEqual(readSaved(storage, STORAGE_KEYS.essay, null, isEssayDraft), {data: draft, status: 'saved'});
});

test('missing, blocked, malformed, unsupported-version and invalid saves fail safely without deleting data', () => {
  const storage = memoryStorage();
  assert.deepEqual(readSaved(storage, 'draft', {}, isEssayDraft), {data: {}, status: 'ready'});
  assert.equal(readSaved(null, 'draft', {}, isEssayDraft).status, 'unavailable');
  assert.equal(readSaved({getItem() {throw new Error('blocked');}}, 'draft', {}, isEssayDraft).status, 'unavailable');
  for (const raw of ['{broken', 'null', '[]', '{"version":2,"data":{}}', '{"version":1,"data":{"fields":{"essay_q":42},"step":0,"mode":"guided"}}']) {
    storage.setItem('draft', raw);
    assert.equal(readSaved(storage, 'draft', {}, isEssayDraft).status, 'corrupt');
    assert.equal(storage.getItem('draft'), raw);
  }
  assert.equal(writeSaved({setItem() {throw new Error('quota');}}, 'draft', {}), 'unavailable');
});

test('confidence queue contains precisely Again and Unsure, respects topics and updates after mastery', () => {
  const reviews = {1: 'again', 2: 'unsure', 3: 'confident', 11: 'again'};
  assert.ok(isReviewRecord(reviews));
  assert.deepEqual(matchingCards(FLASHCARDS, 'kant', reviews, true).map(card => card.id), [1, 2]);
  assert.deepEqual(matchingCards(FLASHCARDS, 'all', {...reviews, 1: 'confident', 2: 'confident', 11: 'confident'}, true), []);
  assert.equal(isReviewRecord({1: 'pass'}), false);
  assert.equal(matchingCards(FLASHCARDS, 'augustine').length, 0);
});

test('logic answer, reveal state, and revision persist together without grading', () => {
  const storage = memoryStorage();
  const answers = {8: {answer: 'The bridge is unstated.', revision: 'Validity needs a premise about truthfulness.', revealed: true}};
  assert.ok(isLogicAttempts(answers));
  writeSaved(storage, STORAGE_KEYS.logic, answers);
  assert.deepEqual(readSaved(storage, STORAGE_KEYS.logic, {}, isLogicAttempts).data, answers);
  assert.equal(isLogicAttempts({8: {answer: null, revision: '', revealed: true}}), false);
});

test('incomplete export labels all missing prompts and treats input as literal text', () => {
  const text = makeEssayText({essay_q: '<img src=x onerror=alert(1)> & "question"', thesis: 'First line\nSecond line'}, ESSAY_STEPS);
  assert.match(text, /2\/25 prompts completed — DRAFT \/ INCOMPLETE/);
  assert.ok(text.includes('<img src=x onerror=alert(1)> & "question"'));
  assert.ok(text.includes('First line\nSecond line'));
  assert.equal((text.match(/\[Not yet completed\]/g) || []).length, 23);
  assert.ok(text.includes('Final judgement — Overall conclusion'));
});

const generated = {title: 'A conditional', argument: ['P1: If A, then B.', 'P2: A.', 'C: B.'], question: 'Is this valid?', hint: 'Follow the conditional.', solution: 'It is valid by modus ponens. The premises still require assessment.'};
test('AI problem validator accepts usable JSON and strips untrusted extra fields', () => {
  assert.deepEqual(validateGeneratedProblem(JSON.stringify(generated)), generated);
  assert.deepEqual(validateGeneratedProblem('```json\n' + JSON.stringify({...generated, id: 'spoof', sources: [{url: 'javascript:alert(1)'}]}) + '\n```'), generated);
});

test('AI problem validator rejects malformed, partial, oversized and incorrectly labelled problems', () => {
  for (const value of ['', '[]', 'null', '{}', JSON.stringify({...generated, title: {html: 'no'}}), JSON.stringify({...generated, argument: ['P1: A', 'C: B']}), JSON.stringify({...generated, argument: ['P1: A', 'P3: B', 'C: A']}), JSON.stringify({...generated, solution: 'x'.repeat(16001)}), JSON.stringify(generated) + '\nOther text']) {
    assert.throws(() => validateGeneratedProblem(value));
  }
});

test('reloaded AI practice cannot introduce unreviewed links or invalid display metadata', () => {
  const saved = {...generated, id: 'ai-123-abcd', difficulty: 'easy', isAI: true};
  assert.ok(isGeneratedProblemList([saved]));
  assert.equal(isGeneratedProblemList([{...saved, sources: [{url: 'javascript:alert(1)'}]}]), false);
  assert.equal(isGeneratedProblemList([{...saved, isAI: false}]), false);
  assert.equal(isGeneratedProblemList([{...saved, difficulty: 'invalid'}]), false);
});

test('generation requests require a flat string solution through the structured-output grammar', () => {
  for (const difficulty of ['easy', 'moderate', 'hard']) {
    const request = buildLogicGenerationRequest(difficulty);
    assert.equal(request.responseFormat.type, 'json_object');
    const schema = JSON.parse(request.responseFormat.schema);
    assert.deepEqual(schema, LOGIC_PROBLEM_SCHEMA);
    assert.equal(schema.properties.solution.type, 'string');
    assert.equal(schema.properties.argument.type, 'array');
    assert.equal(schema.properties.argument.items.type, 'string');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(new Set(schema.required), new Set(Object.keys(generated)));
    assert.ok(request.system.length <= 6500 && request.prompt.length <= 1800);
    assert.ok(request.maxTokens <= 1400);
  }
  assert.throws(() => buildLogicGenerationRequest('unknown'));
});

test('object or list solutions still fail closed instead of becoming a displayed model answer', () => {
  assert.throws(() => validateGeneratedProblem(JSON.stringify({...generated, solution: {validity: 'Valid', soundness: 'Unknown'}})), /invalid solution/);
  assert.throws(() => validateGeneratedProblem(JSON.stringify({...generated, solution: ['Valid', 'Soundness unknown']})), /invalid solution/);
});
