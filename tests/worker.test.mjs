import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, createThinkFilter, classifyUpstreamError, buildAskRequest, extractText, chunkText, stripThinking, DEFAULT_MODEL, CANDIDATE_MODELS, requestOptions, runQuietly, outcomeOf, attemptsFor, responsesShape } from '../worker/src/tutor.js';

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
    assert.equal(model, '@cf/openai/gpt-oss-120b');
    assert.equal(options.stream, true);
    // gpt-oss: Responses API shape first, with the reasoning effort set to low in the API and in the prompt.
    assert.equal(options.messages, undefined);
    assert.match(options.instructions, /^Reasoning: low\n\n/);
    assert.match(options.instructions, /Logic Practice/);
    assert.deepEqual(options.input, [{ role: 'user', content: 'What is modus tollens?' }]);
    assert.deepEqual(options.reasoning, { effort: 'low' });
    assert.equal(options.max_output_tokens, 1000);
    assert.equal(options.temperature, 0.3);
    return upstreamStream(['Modus tollens ', 'is valid.']);
  }) };
  const response = await handleRequest(post('/ask', { question: 'What is modus tollens?' }), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type'), /text\/event-stream/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const events = await readEvents(response);
  assert.equal(events[0].type, 'meta');
  assert.equal(events[0].allowance, 10);
  assert.equal(events[0].remaining, 10, 'without a cache the daily count is open');
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

test('health reports the model, and a deployment without the AI binding says so', async () => {
  const health = await handleRequest(new Request('https://tutor.example/health', { headers: { Origin: ORIGIN } }), { AI: fakeAI(() => 'x') });
  assert.deepEqual(await health.json(), { ok: true, model: DEFAULT_MODEL, label: 'gpt-oss-120b', quiet: 'responses', effort: 'low', configured: true, limiter: false, limits: { questionChars: 1500, answerTokens: 1000, perMinute: 3, perDay: 10 } });
  const missing = await handleRequest(post('/ask', { question: 'q' }), {});
  assert.equal(missing.status, 503);
  assert.equal((await handleRequest(post('/logic', { difficulty: 'easy' }), { AI: fakeAI(() => 'x') })).status, 404, 'AI is for tutoring only; no generation endpoint');
  assert.equal(extractText({ choices: [{ message: { content: 'hi' } }] }), 'hi');
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
  const good = await handleRequest(new Request('https://tutor.example/probe', { headers: { Origin: ORIGIN } }), { AI: fakeAI((model, options) => { assert.equal(options.max_output_tokens, 400); assert.deepEqual(options.reasoning, { effort: 'low' }); assert.deepEqual(options.input, [{ role: 'user', content: 'Reply with exactly the single word: OK' }]); assert.equal(options.instructions, undefined); return { choices: [{ message: { content: 'OK' } }] }; }) });
  const body = await good.json();
  assert.equal(body.ok, true);
  assert.equal(body.text, 'OK');
  const bad = await handleRequest(new Request('https://tutor.example/probe', { headers: { Origin: ORIGIN } }), { AI: fakeAI(() => { throw new Error('AiError: 5006 invalid parameter'); }) });
  assert.equal(bad.status, 502);
  assert.match((await bad.json()).error, /5006/);
});

test('every model family gets a budget it understands, and reasoning is switched off where the schema allows', async () => {
  const messages = [{ role: 'system', content: 's' }, { role: 'user', content: 'Why is modus tollens valid?' }];
  const gemma = requestOptions('@cf/google/gemma-4-26b-a4b-it', messages, 1600, { stream: true });
  assert.equal(gemma.max_tokens, 1600);
  assert.equal(gemma.max_completion_tokens, 1600);
  assert.equal(gemma.stream, true);
  assert.deepEqual(gemma.messages, messages, 'no prompt change for the template families');
  const qwen = requestOptions('@cf/qwen/qwen3-30b-a3b-fp8', messages, 1600);
  assert.match(qwen.messages.at(-1).content, /\/no_think$/, 'Qwen3 soft switch goes on the user turn');
  assert.equal(qwen.messages[0].content, 's');
  assert.equal(messages.at(-1).content, 'Why is modus tollens valid?', 'the caller\'s messages are not mutated');

  // Template family: both knobs, then effort only, then plain, then without max_completion_tokens.
  const ai = fakeAI((model, options, n) => { if (n < 4) throw new Error('AiError: 5006 invalid parameter chat_template_kwargs'); return { response: 'ok' }; });
  assert.deepEqual(await runQuietly(ai, '@cf/google/gemma-4-26b-a4b-it', gemma), { response: 'ok' });
  assert.equal(ai.calls.length, 4);
  assert.equal(ai.calls[0].options.chat_template_kwargs.enable_thinking, false);
  assert.equal(ai.calls[0].options.reasoning_effort, 'low');
  assert.equal(ai.calls[1].options.chat_template_kwargs, undefined);
  assert.equal(ai.calls[1].options.reasoning_effort, 'low');
  assert.equal(ai.calls[2].options.reasoning_effort, undefined);
  assert.equal(ai.calls[3].options.max_completion_tokens, undefined);
  assert.equal(ai.calls[3].options.max_tokens, 1600);

  // Instruct family: no knobs at all, and a non-schema error is not retried.
  const llama = fakeAI(() => { throw new Error('socket hang up'); });
  await assert.rejects(runQuietly(llama, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', requestOptions('@cf/meta/llama-3.3-70b-instruct-fp8-fast', messages, 1600)), /socket hang up/);
  assert.equal(llama.calls.length, 1);
  assert.equal(llama.calls[0].options.reasoning_effort, undefined);

  // gpt-oss: Responses shape first; if the platform wants chat messages instead, the ladder falls back
  // to messages + reasoning_effort, then plain messages.
  const ossOptions = requestOptions('@cf/openai/gpt-oss-20b', messages, 1000, { stream: true });
  assert.match(ossOptions.messages[0].content, /^Reasoning: low\n\ns$/, 'the effort is also stated in the system text');
  const oss = fakeAI((model, options, n) => { if (n === 1) throw new Error('AiError: 5006 prompt or messages is required'); return { response: 'fine' }; });
  await runQuietly(oss, '@cf/openai/gpt-oss-20b', ossOptions);
  assert.equal(oss.calls.length, 2);
  assert.deepEqual(oss.calls[0].options.reasoning, { effort: 'low' });
  assert.equal(oss.calls[0].options.instructions, 'Reasoning: low\n\ns');
  assert.equal(oss.calls[0].options.max_output_tokens, 1000);
  assert.equal(oss.calls[0].options.stream, true);
  assert.equal(oss.calls[1].options.reasoning, undefined);
  assert.equal(oss.calls[1].options.reasoning_effort, 'low');
  assert.equal(oss.calls[1].options.max_tokens, 1000);
  assert.equal(oss.calls[1].options.messages[1].content, 'Why is modus tollens valid?');
  assert.deepEqual(attemptsFor('@cf/openai/gpt-oss-20b', ossOptions).map(a => Object.keys(a).includes('input') ? 'responses' : a.reasoning_effort ? 'effort' : a.max_completion_tokens ? 'plain' : 'older'), ['responses', 'effort', 'plain', 'older']);

  // A schema rejection on every rung surfaces the last error.
  const stubborn = fakeAI(() => { throw new Error('AiError: unknown property'); });
  await assert.rejects(runQuietly(stubborn, '@cf/google/gemma-4-26b-a4b-it', gemma), /unknown property/);
  assert.equal(stubborn.calls.length, 4);
});

test('the probe can try any listed model with the real tutor prompt, refuses unlisted ones, and reports how the call ended', async () => {
  const seen = [];
  const env = { AI: fakeAI((model, options) => { seen.push({ model, options }); return { choices: [{ message: { content: '<think>hmm</think>Because denying the consequent…', reasoning_content: 'private' }, finish_reason: 'stop' }], usage: { prompt_tokens: 700, completion_tokens: 90 } }; }) };
  const url = `https://tutor.example/probe?model=${encodeURIComponent('@cf/meta/llama-3.3-70b-instruct-fp8-fast')}&q=${encodeURIComponent('Why is modus tollens valid?')}`;
  const response = await handleRequest(new Request(url, { headers: { Origin: ORIGIN } }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(body.text, 'Because denying the consequent…', 'think blocks are stripped and the answer kept');
  assert.equal(body.finish, 'stop');
  assert.equal(body.usage.completion_tokens, 90);
  assert.equal(body.reasoningChars, 'private'.length);
  assert.equal(typeof body.ms, 'number');
  assert.equal(seen[0].model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(seen[0].options.max_tokens, 1000, 'a real question gets the answer budget');
  assert.equal(seen[0].options.messages[0].role, 'system');
  assert.match(seen[0].options.messages[0].content, /study tutor for EduResources/);
  assert.equal(seen[0].options.messages[1].content, 'Why is modus tollens valid?');
  assert.equal(seen[0].options.reasoning_effort, undefined, 'instruct models get no reasoning knobs');

  const refused = await handleRequest(new Request('https://tutor.example/probe?model=%40cf%2Fevil%2Fmodel', { headers: { Origin: ORIGIN } }), env);
  assert.equal(refused.status, 400);
  assert.deepEqual((await refused.json()).models, Object.keys(CANDIDATE_MODELS));
  assert.equal(seen.length, 1, 'an unlisted model is never run');

  const silent = { AI: fakeAI(() => ({ choices: [{ message: { content: '', reasoning_content: 'x'.repeat(50) }, finish_reason: 'length' }], usage: { completion_tokens: 1600 } })) };
  const empty = await (await handleRequest(new Request('https://tutor.example/probe?q=Explain+Hume', { headers: { Origin: ORIGIN } }), silent)).json();
  assert.equal(empty.ok, false);
  assert.equal(empty.finish, 'length');
  assert.equal(empty.reasoningChars, 50);
  assert.equal(empty.model, DEFAULT_MODEL);
  assert.deepEqual(outcomeOf({ output: [] }), { finish: null, usage: null, reasoningChars: 0 });
  assert.equal(extractText({ output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: 'Yes. ' }, { type: 'output_text', text: 'Because…' }] }] }), 'Yes. Because…');
});

test('when a stream carries only hidden reasoning, the diagnostic says how it ended', async () => {
  const chunks = [
    { choices: [{ delta: { content: '', reasoning_content: null, role: 'assistant' }, finish_reason: null }] },
    { choices: [{ delta: { reasoning_content: 'thinking '.repeat(20) }, finish_reason: null }] },
    { choices: [{ delta: {}, finish_reason: 'length' }], usage: { prompt_tokens: 700, completion_tokens: 1600 } },
  ];
  const env = { AI: fakeAI(() => new ReadableStream({ start(controller) { for (const c of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`)); controller.close(); } })) };
  const events = await readEvents(await handleRequest(post('/ask', { question: 'Explain Hume’s fork.' }), env));
  assert.equal(events.at(-1).type, 'error');
  assert.match(events.at(-1).detail, /finish_reason length/);
  assert.match(events.at(-1).detail, /hidden reasoning 180 characters/);
  assert.match(events.at(-1).detail, /"completion_tokens":1600/);
});

test('ten questions a day per browser: the eleventh is refused, another browser is unaffected, and the count resets next day', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['ok'])) };
  const store = new Map();
  const caches = { default: { match: async url => store.get(url) ? new Response(store.get(url)) : undefined, put: async (url, response) => { store.set(url, await response.text()); } } };
  let now = Date.UTC(2026, 8, 14, 9, 0, 0);
  const deps = { caches, now: () => now };
  const ask = (client, minute) => { now = Date.UTC(2026, 8, 14, 9, minute, 0); return handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': client }), env, {}, deps); };
  for (let i = 0; i < 10; i++) {
    const response = await ask('pupil-a-00000000', i);   // one a minute, so the minute limit never bites
    assert.equal(response.status, 200, `question ${i + 1}`);
    const meta = (await readEvents(response))[0];
    assert.equal(meta.remaining, 9 - i, 'the meta event counts down');
    assert.equal(meta.allowance, 10);
  }
  const eleventh = await ask('pupil-a-00000000', 11);
  assert.equal(eleventh.status, 429);
  const body = await eleventh.json();
  assert.equal(body.error, 'daily_limit');
  assert.match(body.message, /10 questions for today/);
  assert.equal(body.remaining, 0);
  assert.equal(env.AI.calls.length, 10, 'the refused question never reaches the model');
  assert.equal((await ask('pupil-b-00000000', 12)).status, 200, 'a different browser has its own allowance');
  now = Date.UTC(2026, 8, 15, 0, 0, 1);
  assert.equal((await handleRequest(post('/ask', { question: 'q' }, { 'X-Tutor-Client': 'pupil-a-00000000' }), env, {}, deps)).status, 200, 'midnight UTC resets the day');
  // Without any cache the daily rule is open rather than closed.
  const bare = await handleRequest(post('/ask', { question: 'q' }), env, {}, { caches: {} });
  assert.equal(bare.status, 200);
});

test('a question over 1,500 characters gets a plain message instead of a truncated answer', async () => {
  const env = { AI: fakeAI(() => upstreamStream(['ok'])) };
  const long = await handleRequest(post('/ask', { question: 'x'.repeat(1501) }), env);
  assert.equal(long.status, 400);
  const body = await long.json();
  assert.equal(body.error, 'too_long');
  assert.match(body.message, /1,500 characters/);
  assert.equal(body.limit, 1500);
  assert.equal(env.AI.calls.length, 0);
  assert.equal((await handleRequest(post('/ask', { question: 'y'.repeat(1500) }), env)).status, 200, 'exactly the limit is fine');
});

test('Responses-API streams: reasoning deltas are hidden, text deltas shown, and an incomplete answer is diagnosed', async () => {
  const events = (...items) => new ReadableStream({ start(controller) { for (const item of items) controller.enqueue(encoder.encode(`data: ${JSON.stringify(item)}\n\n`)); controller.close(); } });
  const good = { AI: fakeAI(() => events(
    { type: 'response.reasoning_text.delta', delta: 'private thought' },
    { type: 'response.output_text.delta', delta: 'Modus tollens ' },
    { type: 'response.output_text.delta', delta: 'is valid.' },
    { type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 700, output_tokens: 60, output_tokens_details: { reasoning_tokens: 12 } } } },
  )) };
  const shown = await readEvents(await handleRequest(post('/ask', { question: 'Is modus tollens valid?' }), good));
  assert.equal(shown.filter(e => e.type === 'delta').map(e => e.text).join(''), 'Modus tollens is valid.');
  assert.equal(shown.at(-1).type, 'done');

  const silent = { AI: fakeAI(() => events(
    { type: 'response.reasoning_text.delta', delta: 'thinking '.repeat(30) },
    { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, usage: { input_tokens: 700, output_tokens: 1000 } } },
  )) };
  const diagnosed = await readEvents(await handleRequest(post('/ask', { question: 'Explain Hume’s fork.' }), silent));
  assert.equal(diagnosed.at(-1).type, 'error');
  assert.match(diagnosed.at(-1).detail, /finish_reason max_output_tokens/);
  assert.match(diagnosed.at(-1).detail, /hidden reasoning 270 characters/);
  assert.match(diagnosed.at(-1).detail, /"output_tokens":1000/);

  const failed = { AI: fakeAI(() => events({ type: 'response.failed', response: { error: { message: 'model overloaded' } } })) };
  const failure = await readEvents(await handleRequest(post('/ask', { question: 'q' }), failed));
  assert.equal(failure.at(-1).type, 'error');
  assert.match(failure.at(-1).detail, /model overloaded/);

  // Non-streamed Responses result: text from the message item, reasoning measured, status reported.
  const result = { status: 'completed', usage: { output_tokens: 80 }, output: [{ type: 'reasoning', summary: [{ type: 'summary_text', text: 'brief' }] }, { type: 'message', content: [{ type: 'output_text', text: 'Yes.' }] }] };
  assert.equal(extractText(result), 'Yes.');
  assert.deepEqual(outcomeOf(result), { finish: 'completed', usage: { output_tokens: 80 }, reasoningChars: 5 });
  assert.equal(outcomeOf({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [] }).finish, 'max_output_tokens');
  const shaped = responsesShape({ messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }], max_tokens: 1000, max_completion_tokens: 1000, temperature: 0.3, stream: true });
  assert.deepEqual(shaped, { temperature: 0.3, stream: true, instructions: 'S', input: [{ role: 'user', content: 'U' }], reasoning: { effort: 'low' }, max_output_tokens: 1000 });
});
