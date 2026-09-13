import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, createThinkFilter, classifyUpstreamError, buildAskRequest, buildLogicRequest, extractText, chunkText, stripThinking, DEFAULT_MODEL } from '../worker/src/tutor.js';

const ORIGIN = 'https://slimsh8dy.github.io';
const encoder = new TextEncoder();
const upstreamStream = pieces => new ReadableStream({
  start(controller) {
    for (const piece of pieces) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: piece })}\n\n`));
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  },
});
const post = (path, body, headers = {}) => new Request(`https://tutor.example${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.9', 'X-Tutor-Client': 'browser-aaaa-1111', ...headers }, body: JSON.stringify(body),
});
async function readEvents(response) {
  const text = await response.text();
  return text.split('\n\n').filter(Boolean).map(line => JSON.parse(line.replace(/^data: /, '')));
}
function fakeAI(handler) { return { calls: [], async run(model, options) { this.calls.push({ model, options }); return handler(model, options, this.calls.length); } }; }

test('CORS: the site origin is allowed, an unknown origin is refused, preflight succeeds', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['x'])) };
  const preflight = await handleRequest(new Request('https://tutor.example/ask', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const refused = await handleRequest(post('/ask', { question: 'Hi' }, { Origin: 'https://evil.example' }), env);
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get('Access-Control-Allow-Origin'), null);
});

test('ask streams meta, deltas and done, with the grounding prompt built server-side', async () => {
  const env = { AI: fakeAI((model, options) => {
    assert.equal(model, DEFAULT_MODEL);
    assert.equal(options.stream, true);
    assert.equal(options.messages[0].role, 'system');
    assert.match(options.messages[0].content, /Logic Practice/);
    assert.equal(options.messages[1].content, 'What is modus tollens?');
    return upstreamStream(['Modus tollens ', 'is valid.']);
  }) };
  const response = await handleRequest(post('/ask', { question: 'What is modus tollens?' }), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type'), /text\/event-stream/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const events = await readEvents(response);
  assert.equal(events[0].type, 'meta');
  assert.ok(events[0].resources.some(r => r.id === 'tool-logic-practice'));
  assert.equal(events.filter(e => e.type === 'delta').map(e => e.text).join(''), 'Modus tollens is valid.');
  assert.equal(events.at(-1).type, 'done');
});

test('thinking blocks are stripped from streamed answers, even across chunk boundaries', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['<thi', 'nk>private reasoning</think>', 'Public answer.'])) };
  const events = await readEvents(await handleRequest(post('/ask', { question: 'Explain duty' }), env));
  assert.equal(events.filter(e => e.type === 'delta').map(e => e.text).join(''), 'Public answer.');
  const filter = createThinkFilter();
  assert.equal(filter.push('Plain ') + filter.push('text') + filter.flush(), 'Plain text');
});

test('empty or oversized questions are rejected before any model call', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['x'])) };
  assert.equal((await handleRequest(post('/ask', { question: '   ' }), env)).status, 400);
  assert.equal((await handleRequest(post('/ask', { question: 'a'.repeat(9000) }), env)).status, 413);
  assert.equal((await handleRequest(new Request('https://tutor.example/ask', { method: 'POST', headers: { Origin: ORIGIN }, body: '{not json' }), env)).status, 400);
  assert.equal(env.AI.calls.length, 0);
});

test('the per-visitor limit blocks a fourth request within the window and resets afterwards', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['ok'])) };
  const store = new Map();
  const caches = { default: { match: async url => store.get(url) ? new Response(store.get(url)) : undefined, put: async (url, response) => { store.set(url, await response.text()); } } };
  let now = 1_000_000;
  const deps = { caches, now: () => now };
  for (let i = 0; i < 3; i++) assert.equal((await handleRequest(post('/ask', { question: 'q' }), env, {}, deps)).status, 200);
  const blocked = await handleRequest(post('/ask', { question: 'q' }), env, {}, deps);
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, 'rate_limited');
  now += 61_000;
  assert.equal((await handleRequest(post('/ask', { question: 'q' }), env, {}, deps)).status, 200);
  const bindingEnv = { ...env, LIMITER: { limit: async () => ({ success: false }) } };
  assert.equal((await handleRequest(post('/ask', { question: 'q' }), bindingEnv)).status, 429);
});

test('a classroom behind one address: different browsers keep their own limit, up to the address ceiling', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['ok'])) };
  const store = new Map();
  const caches = { default: { match: async url => store.get(url) ? new Response(store.get(url)) : undefined, put: async (url, response) => { store.set(url, await response.text()); } } };
  const deps = { caches, now: () => 5_000_000 };
  for (let pupil = 0; pupil < 13; pupil++) {
    for (let i = 0; i < 3; i++) {
      const response = await handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': `pupil-${pupil}-0000` }), env, {}, deps);
      assert.equal(response.status, 200, `pupil ${pupil} question ${i}`);
    }
  }
  // 39 requests so far from one address; the 41st is refused by the per-address ceiling of 40.
  assert.equal((await handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': 'pupil-13-0000' }), env, {}, deps)).status, 200);
  assert.equal((await handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': 'pupil-14-0000' }), env, {}, deps)).status, 429);
  // A malformed client id falls back to the address as the per-visitor key.
  assert.equal((await handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': '<script>' }), env, {}, deps)).status, 429);
});

test('a used-up daily allowance becomes a clear quota message', async () => {
  const env = { AI: fakeAI(() => { throw new Error('3040: You have exceeded your daily Workers AI quota'); }) };
  const response = await handleRequest(post('/ask', { question: 'q' }), env);
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.error, 'quota');
  assert.match(body.message, /midnight UTC/);
  assert.equal(classifyUpstreamError(new Error('socket hang up')).code, 'upstream');
});

test('logic generation requests structured output and falls back if the model rejects it', async () => {
  const env = { AI: fakeAI((model, options, call) => {
    if (call === 1) { assert.equal(options.response_format.type, 'json_schema'); throw new Error('response_format not supported for this model'); }
    assert.equal(options.response_format, undefined);
    return { response: { title: 'A gate', argument: ['P1: a', 'P2: b', 'C: c'], question: 'q', hint: 'h', solution: 's' } };
  }) };
  const response = await handleRequest(post('/logic', { difficulty: 'easy' }), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(JSON.parse(body.problem).title, 'A gate');
  assert.equal(env.AI.calls.length, 2);
  assert.equal((await handleRequest(post('/logic', { difficulty: 'impossible' }), env)).status, 400);
  assert.throws(() => buildLogicRequest('nope'), /difficulty/);
  assert.equal(extractText({ choices: [{ message: { content: 'hi' } }] }), 'hi');
});

test('health reports the model, and a deployment without the AI binding says so', async () => {
  const health = await handleRequest(new Request('https://tutor.example/health', { headers: { Origin: ORIGIN } }), { AI: fakeAI(() => 'x') });
  assert.deepEqual(await health.json(), { ok: true, model: DEFAULT_MODEL, configured: true });
  const missing = await handleRequest(post('/ask', { question: 'q' }), {});
  assert.equal(missing.status, 503);
  assert.equal(buildAskRequest('Kant duty').resources.length > 0, true);
});

test('a stream with no answer text ends in an error event carrying a diagnostic, and other chunk shapes are read', async () => {
  const env = { AI: fakeAI(() => new ReadableStream({ start(controller) { controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"thinking only"}}]}\n\n')); controller.close(); } })) };
  const events = await readEvents(await handleRequest(post('/ask', { question: 'q' }), env));
  assert.equal(events.at(-1).type, 'error');
  assert.match(events.at(-1).detail, /No answer text/);
  assert.equal(chunkText({ choices: [{ delta: { content: 'a' } }] }), 'a');
  assert.equal(chunkText({ type: 'response.output_text.delta', delta: 'b' }), 'b');
  assert.equal(chunkText({ choices: [{ delta: { reasoning_content: 'hidden' } }] }), '');
  assert.equal(stripThinking('<think>x</think>Answer'), 'Answer');
  const errorStream = { AI: fakeAI(() => new ReadableStream({ start(controller) { controller.enqueue(encoder.encode('data: {"error":{"message":"model unavailable"}}\n\n')); controller.close(); } })) };
  const failed = await readEvents(await handleRequest(post('/ask', { question: 'q' }), errorStream));
  assert.equal(failed.at(-1).type, 'error');
  assert.match(failed.at(-1).detail, /model unavailable/);
});

test('probe performs one small real call and reports the shape or the error text', async () => {
  const good = await handleRequest(new Request('https://tutor.example/probe', { headers: { Origin: ORIGIN } }), { AI: fakeAI((model, options) => { assert.equal(options.max_completion_tokens, 400); return { choices: [{ message: { content: 'OK' } }] }; }) });
  const body = await good.json();
  assert.equal(body.ok, true);
  assert.equal(body.text, 'OK');
  const bad = await handleRequest(new Request('https://tutor.example/probe', { headers: { Origin: ORIGIN } }), { AI: fakeAI(() => { throw new Error('AiError: 5006 invalid parameter'); }) });
  assert.equal(bad.status, 502);
  assert.match((await bad.json()).error, /5006/);
});
