import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RESOURCES, RESOURCE_BY_ID } from '../app/src/resources/catalog.js';
import { QUESTION_TOPICS, PRACTICE_QUESTIONS, SELF_REVIEW_CHECKLIST, plannerLink, normalizeQuestionTopic } from '../app/src/resources/questions.js';

test('catalog has unique stable IDs and complete, safe destinations', () => {
  assert.equal(new Set(RESOURCES.map(item => item.id)).size, RESOURCES.length);
  const files = [];
  for (const item of RESOURCES) {
    for (const key of ['id', 'title', 'desc', 'route', 'type', 'section', 'topic']) assert.ok(typeof item[key] === 'string' && item[key], `${item.id}: ${key}`);
    assert.ok(Array.isArray(item.tags) && item.tags.length);
    assert.ok(item.route.startsWith('/') && !item.route.startsWith('//'));
    assert.ok(['pdf', 'audio', 'external', 'tool'].includes(item.type));
    assert.equal(RESOURCE_BY_ID[item.id], item);
    if (['pdf', 'audio'].includes(item.type)) {
      assert.ok(item.file.startsWith('resources/') && !item.file.includes('..'));
      assert.ok(!/ 2\.(pdf|wav)$/.test(item.file));
      assert.ok(existsSync(fileURLToPath(new URL(`../${item.file}`, import.meta.url))), item.file);
      files.push(item.file);
    }
    if (item.type === 'external') assert.equal(new URL(item.url).protocol, 'https:');
  }
  assert.equal(new Set(files).size, files.length);
});

test('catalog preserves the six original audio references only', () => {
  assert.deepEqual(RESOURCES.filter(item => item.type === 'audio').map(item => item.file).sort(), [
    'Bentham-intro', 'Bentham-strengths-weaknesses', 'Mill-summary', 'Defender-Challenger', 'Kant-SEP1', 'Kant-SEP2',
  ].map(name => `resources/${name}.wav`).sort());
});

test('newly exposed draft and legacy sources carry visible caveats', () => {
  for (const item of RESOURCES.filter(item => item.type === 'pdf' && (item.id.startsWith('legacy-') || item.id.includes('-essay')))) {
    assert.ok(item.reviewNote, item.id);
  }
});

test('question bank provides 27 original prompts across nine topics', () => {
  assert.equal(QUESTION_TOPICS.length, 9);
  assert.equal(PRACTICE_QUESTIONS.length, 27);
  assert.equal(new Set(PRACTICE_QUESTIONS.map(item => item.id)).size, 27);
  assert.equal(new Set(PRACTICE_QUESTIONS.map(item => item.prompt)).size, 27);
  assert.equal(SELF_REVIEW_CHECKLIST.length, 5);
  for (const topic of QUESTION_TOPICS) assert.equal(PRACTICE_QUESTIONS.filter(item => item.topic === topic.id).length, 3);
});

test('planner links preserve all prompt characters and topic aliases are safe', () => {
  const prompt = 'What about <script>, A & B, “duty”, and #1?';
  const url = new URL(plannerLink(prompt), 'https://example.com');
  assert.equal(url.pathname, '/philosophy-basics');
  assert.equal(url.searchParams.get('question'), prompt);
  assert.equal(normalizeQuestionTopic('Kantian Ethics'), 'kantianism');
  assert.equal(normalizeQuestionTopic('Natural Law'), 'natural-law');
  assert.equal(normalizeQuestionTopic('unknown'), 'all');
});

test('PDF and browser bank use the same source content', () => {
  const data = JSON.parse(readFileSync(new URL('../app/src/resources/questionData.json', import.meta.url), 'utf8'));
  assert.deepEqual(data.topics.flatMap(topic => topic.questions.map(question => question.prompt)), PRACTICE_QUESTIONS.map(question => question.prompt));
  assert.ok(existsSync(new URL('../resources/Practice-Questions-Reviewed.pdf', import.meta.url)));
});
