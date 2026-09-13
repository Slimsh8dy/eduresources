import test from 'node:test';
import assert from 'node:assert/strict';
import { browserId, createTutorClient, readEventStream } from '../app/src/ai/client.mjs';
import { relatedResources, resourceTarget, studyContext } from '../app/src/ai/grounding.mjs';

const encoder = new TextEncoder();
const sse = events => new ReadableStream({
  start(controller) {
    for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    controller.close();
  },
});
const streamResponse = events => new Response(sse(events), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('client without an endpoint reports itself unconfigured and refuses to ask', async () => {
  const client = createTutorClient({ endpoint: '' });
  assert.equal(client.getSnapshot().configured, false);
  await assert.rejects(client.ask('Explain validity.'), /not connected/);
  client.dispose();
});

test('ask streams deltas, collects catalogue links and settles idle', async () => {
  const calls = [];
  const client = createTutorClient({
    endpoint: 'https://tutor.example/',
    fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), client: init.headers['X-Tutor-Client'] });
      return streamResponse([
        { type: 'meta', resources: [{ id: 'tool-logic-practice', title: 'Logic Practice', route: '/philosophy-fundamentals/logic-problems' }] },
        { type: 'delta', text: 'A valid argument ' }, { type: 'delta', text: 'preserves truth.' }, { type: 'done' },
      ]);
    },
  });
  const seen = [];
  const result = await client.ask('What is validity?', { onDelta: text => seen.push(text) });
  assert.equal(calls[0].url, 'https://tutor.example/ask');
  assert.deepEqual(calls[0].body, { question: 'What is validity?' });
  assert.match(calls[0].client, /^[A-Za-z0-9-]{8,64}$/);
  assert.deepEqual(seen, ['A valid argument ', 'A valid argument preserves truth.']);
  assert.equal(result.answer, 'A valid argument preserves truth.');
  assert.equal(result.resources[0].id, 'tool-logic-practice');
  assert.equal(client.getSnapshot().status, 'idle');
  assert.equal(client.getSnapshot().busy, false);
  client.dispose();
});

test('server error messages are surfaced and overlapping requests are refused', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = createTutorClient({ endpoint: 'https://tutor.example', fetch: async () => { await gate; return jsonResponse({ error: 'quota', message: 'Allowance used up.' }, 429); } });
  const pending = client.ask('Question one');
  await assert.rejects(client.ask('Question two'), { name: 'BusyError' });
  release();
  await assert.rejects(pending, { code: 'quota', message: 'Allowance used up.' });
  assert.equal(client.getSnapshot().status, 'error');
  assert.match(client.getSnapshot().error, /Allowance/);
  client.dispose();
});

test('stop aborts an answer in flight and leaves the client idle', async () => {
  const client = createTutorClient({
    endpoint: 'https://tutor.example',
    fetch: (url, init) => new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(init.signal.reason)); }),
  });
  const pending = client.ask('Explain duty.');
  client.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(client.getSnapshot().status, 'idle');
  const again = client.ask('Second question'); // the client is reusable afterwards
  client.stop();
  await assert.rejects(again, { name: 'AbortError' });
  client.dispose();
});

test('a timeout is reported as a recoverable error', async () => {
  const client = createTutorClient({
    endpoint: 'https://tutor.example', timeoutMs: 10,
    fetch: (url, init) => new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(init.signal.reason)); }),
  });
  await assert.rejects(client.ask('A slow question'), /took too long/);
  assert.equal(client.getSnapshot().status, 'error');
  client.dispose();
});

test('logic generation returns the raw JSON text for the site to validate', async () => {
  const client = createTutorClient({ endpoint: 'https://tutor.example', fetch: async (url, init) => {
    assert.equal(url, 'https://tutor.example/logic');
    assert.deepEqual(JSON.parse(init.body), { difficulty: 'easy' });
    return jsonResponse({ problem: '{"title":"x"}' });
  } });
  assert.equal(await client.generateLogicProblem('easy'), '{"title":"x"}');
  client.dispose();
});

test('browser id is stable per storage and survives storage failures', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const first = browserId(storage);
  assert.equal(browserId(storage), first);
  assert.match(first, /^[A-Za-z0-9-]{8,64}$/);
  assert.match(browserId(null), /^[A-Za-z0-9-]{8,64}$/);
  assert.match(browserId({ getItem() { throw new Error('blocked'); }, setItem() {} }), /^[A-Za-z0-9-]{8,64}$/);
});

test('event-stream parser copes with events split across chunks', async () => {
  const text = 'data: {"type":"delta","text":"Hel"}\n\ndata: {"type":"delta","text":"lo"}\n\ndata: {"type":"done"}\n\n';
  const parts = [text.slice(0, 20), text.slice(20, 47), text.slice(47)];
  const body = new ReadableStream({ start(controller) { for (const part of parts) controller.enqueue(encoder.encode(part)); controller.close(); } });
  const events = [];
  await readEventStream(body, event => events.push(event));
  assert.deepEqual(events.map(e => e.type), ['delta', 'delta', 'done']);
  assert.equal(events[0].text + events[1].text, 'Hello');
});

test('catalog grounding ranks matches and links only safe catalog routes/files', () => {
  const catalog = [
    { id: 'kant', title: 'Kant: duty', desc: 'Categorical imperative', route: '/revision/kant' },
    { id: 'essay', title: 'Essay Planner', file: 'resources/Essay plan.pdf' },
  ];
  assert.equal(relatedResources('Explain Kant and duty', catalog)[0].id, 'kant');
  assert.equal(resourceTarget(catalog[1], '/eduresources/').href, '/eduresources/resources/Essay%20plan.pdf');
  assert.equal(resourceTarget({ route: '//evil.example' }), null);
  assert.equal(resourceTarget({ file: 'resources/../../secret.pdf' }), null);
  assert.equal(resourceTarget({ file: 'javascript:alert(1)' }), null);
  const context = studyContext('Kant', catalog, [{ resourceId: 'kant', title: 'Kant: Duty', text: 'Duty concerns moral obligation.' }]);
  assert.match(context.system, /Duty concerns moral obligation/);
  assert.match(context.system, /do not produce URLs/i);
});

test('modus tollens retrieves the matching excerpt and its tool link instead of arbitrary first cards', () => {
  const catalog = [
    { id: 'tool-flashcards', title: 'Philosophy Flashcards', route: '/flashcards' },
    { id: 'tool-logic-practice', title: 'Logic Practice', route: '/philosophy-fundamentals/logic-problems' },
  ];
  const excerpts = [
    { resourceId: 'tool-flashcards', title: 'Kant: Duty', text: 'UNRELATED_DUTY' },
    { resourceId: 'tool-flashcards', title: 'Mill: Pleasure', text: 'UNRELATED_PLEASURE' },
    { resourceId: 'tool-flashcards', title: 'Bentham: Utility', text: 'UNRELATED_UTILITY' },
    { resourceId: 'tool-logic-practice', title: 'Modus tollens', text: 'If P then Q; not Q; therefore not P. This form is valid.' },
    { resourceId: 'invalid-catalog-id', title: 'Modus tollens', text: 'UNTRUSTED_ORPHAN' },
  ];
  const context = studyContext('What is modus tollens?', catalog, excerpts);
  assert.match(context.system, /If P then Q; not Q; therefore not P/);
  assert.doesNotMatch(context.system, /UNRELATED_|UNTRUSTED_ORPHAN|Teacher-reviewed/i);
  assert.deepEqual(context.resources.map(resource => resource.id), ['tool-logic-practice']);
  assert.equal(resourceTarget(context.resources[0]).href, '/philosophy-fundamentals/logic-problems');
  assert.match(context.system, /correct site tool is exactly "Logic Practice"/);
  assert.match(context.system, /Source tool: Logic Practice/);
});

test('excerpt retrieval prioritizes title matches and limits references to three 700-character excerpts', () => {
  const catalog = [{ id: 'tool', title: 'Study tool', route: '/study' }];
  const excerpts = [
    { resourceId: 'tool', title: 'General philosophy', text: `A passing mention of modus tollens. ${'a'.repeat(2000)}` },
    { resourceId: 'tool', title: 'Modus tollens', text: `BEST_MATCH ${'b'.repeat(2000)}` },
    { resourceId: 'tool', title: 'Modus tollens application', text: 'c'.repeat(2000) },
    { resourceId: 'tool', title: 'Modus tollens counterexample', text: 'd'.repeat(2000) },
  ];
  const context = studyContext('modus tollens', catalog, excerpts);
  const supplied = context.system.split('Reviewed study excerpts:\n')[1];
  assert.ok(supplied.startsWith('Source tool: Study tool\nModus tollens\nBEST_MATCH'));
  assert.doesNotMatch(supplied, /passing mention/);
  assert.ok(supplied.length <= 2104);
});
