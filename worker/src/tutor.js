// EduResources tutor — Cloudflare Worker logic.
// The Worker owns the prompts and grounding, so the browser only ever sends a question.
// Nothing here stores a key: the model is reached through the Workers AI binding (env.AI).
import { RESOURCES } from '../../app/src/resources/catalog.js';
import { REVIEWED_EXCERPTS } from '../../app/src/ai/excerpts.js';
import { studyContext } from '../../app/src/ai/grounding.mjs';
import { buildLogicGenerationRequest, LOGIC_PROBLEM_SCHEMA } from '../../app/src/learning/state.mjs';

export const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const DEFAULT_ORIGINS = ['https://slimsh8dy.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];
export const LIMITS = Object.freeze({
  questionChars: 1800,
  bodyBytes: 8 * 1024,
  // Gemma 4 reasons privately before it answers and that reasoning counts against the budget.
  answerTokens: 1600,
  logicTokens: 4000,
  probeTokens: 400,
  perVisitor: { limit: 3, period: 60 },  // per browser (client id); the LIMITER binding carries the same limit when present
  perAddress: { limit: 40, period: 60 }, // per network address, so a whole classroom behind one address is not treated as one visitor
});

const MESSAGES = Object.freeze({
  quota: 'The tutor has used up today’s free allowance for everyone. It resets at midnight UTC (1 a.m. British Summer Time). The rest of the site works as usual.',
  rateLimited: 'You are asking faster than the tutor can fairly serve. Wait a minute and ask again.',
  upstream: 'The tutor could not answer just now. Try again in a moment.',
  unconfigured: 'The tutor is not connected to a model on this deployment.',
});

export function allowedOrigins(env = {}) {
  const configured = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return configured.length ? configured : DEFAULT_ORIGINS;
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const headers = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Tutor-Client', 'Access-Control-Max-Age': '86400' };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
}

/** Short, safe excerpt of an upstream error or payload for diagnostics. */
export function detailOf(value) {
  const text = typeof value === 'string' ? value : value instanceof Error ? `${value.name}: ${value.message}` : JSON.stringify(value);
  return String(text || '').replace(/\s+/g, ' ').slice(0, 400);
}

/** Text content from a streamed chunk in any of the shapes Workers AI uses. Reasoning fields are ignored. */
export function chunkText(parsed) {
  if (!parsed || typeof parsed !== 'object') return '';
  if (typeof parsed.response === 'string') return parsed.response;
  const delta = parsed.choices?.[0]?.delta;
  if (delta && typeof delta.content === 'string') return delta.content;
  if (parsed.type === 'response.output_text.delta' && typeof parsed.delta === 'string') return parsed.delta;
  return '';
}

export function classifyUpstreamError(error) {
  const text = `${error?.message || ''} ${error?.code || ''} ${error?.name || ''}`;
  if (/quota|neuron|daily|exceed|3040|insufficient|allowance/i.test(text)) return { status: 429, code: 'quota', message: MESSAGES.quota };
  if (/rate ?limit|too many|429/i.test(text)) return { status: 429, code: 'rate_limited', message: MESSAGES.rateLimited };
  return { status: 502, code: 'upstream', message: MESSAGES.upstream };
}

/** Best-effort counter in the Cache API: one bucket per key per period. */
async function cacheCount(store, key, { limit, period }, now) {
  const bucket = Math.floor(now / (period * 1000));
  const url = `https://ratelimit.eduresources.invalid/${encodeURIComponent(key)}/${bucket}`;
  const cached = await store.default.match(url);
  const count = cached ? Number(await cached.text()) || 0 : 0;
  if (count >= limit) return false;
  await store.default.put(url, new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${period}` } }));
  return true;
}

/** Returns true when the visitor is within the per-visitor limit. Best effort by design. */
export async function withinLimit(key, env, deps = {}, rule = LIMITS.perVisitor, useBinding = true) {
  if (!key) return true;
  if (useBinding && env.LIMITER && typeof env.LIMITER.limit === 'function') {
    try { const { success } = await env.LIMITER.limit({ key }); return success !== false; }
    catch { return true; }
  }
  const store = deps.caches || globalThis.caches;
  if (!store?.default) return true;
  try { return await cacheCount(store, key, rule, deps.now ? deps.now() : Date.now()); }
  catch { return true; }
}

export function clientId(request) {
  const raw = request.headers.get('X-Tutor-Client') || '';
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : '';
}

export function cleanQuestion(value) {
  if (typeof value !== 'string') return '';
  // Drop control characters (newlines and tabs are kept), then trim and cap the length.
  const keep = ch => { const code = ch.charCodeAt(0); return !(code < 32 && code !== 9 && code !== 10 && code !== 13) && code !== 127; };
  return Array.from(value).filter(keep).join('').trim().slice(0, LIMITS.questionChars);
}

export function buildAskRequest(question) {
  const context = studyContext(question, RESOURCES, REVIEWED_EXCERPTS);
  const resources = context.resources.map(r => ({ id: r.id, title: r.title, type: r.type, route: r.route || null, file: r.file || null }));
  return {
    resources,
    messages: [{ role: 'system', content: context.system.slice(0, 8000) }, { role: 'user', content: question }],
  };
}

export function buildLogicRequest(difficulty) {
  const request = buildLogicGenerationRequest(difficulty); // throws for an unknown difficulty
  return {
    messages: [
      { role: 'system', content: request.system + '\nReturn ONLY a JSON object that follows the required schema. No Markdown fences, no text outside the object.' },
      { role: 'user', content: request.prompt },
    ],
    max_tokens: LIMITS.logicTokens,
    response_format: { type: 'json_schema', json_schema: LOGIC_PROBLEM_SCHEMA },
  };
}

/** Gemma 4 thinks at length before answering, and the thinking counts against the token budget.
 *  Two knobs exist across model families; each family ignores the other's, so both are sent.
 *  If the platform rejects the non-standard one, the call is retried without it. */
export const QUIET = Object.freeze({ reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false } });
export async function runQuietly(ai, model, options) {
  try { return await ai.run(model, { ...options, ...QUIET }); }
  catch (error) {
    if (!/chat_template_kwargs|additional propert|unknown|unexpected|invalid|schema/i.test(String(error?.message || ''))) throw error;
    return ai.run(model, { ...options, reasoning_effort: QUIET.reasoning_effort });
  }
}

/** Pull the text out of whichever shape Workers AI returns for a non-streamed call. */
export function extractText(result) {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (typeof result.response === 'string') return result.response;
  if (result.response && typeof result.response === 'object') return JSON.stringify(result.response);
  const choice = result.choices?.[0];
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  if (typeof result.output_text === 'string') return result.output_text;
  return '';
}

/** Removes complete <think>/<thought>/<reasoning> blocks from a finished text. */
export function stripThinking(text) {
  const filter = createThinkFilter();
  return filter.push(String(text || '')) + filter.flush();
}

/** Removes <think>/<thought> blocks. Works on a running buffer, so it suits streaming. */
export function createThinkFilter() {
  let buffer = '';
  let inside = false;
  let started = false;
  const open = /<(think|thought|reasoning)>/i;
  const close = /<\/(think|thought|reasoning)>/i;
  return {
    push(chunk) {
      buffer += chunk;
      let out = '';
      for (;;) {
        if (inside) {
          const end = close.exec(buffer);
          if (!end) return out;
          buffer = buffer.slice(end.index + end[0].length);
          inside = false;
          continue;
        }
        const start = open.exec(buffer);
        if (start) {
          out += buffer.slice(0, start.index);
          buffer = buffer.slice(start.index + start[0].length);
          inside = true;
          continue;
        }
        // Hold back a possible partial opening tag at the very start of the answer.
        if (!started && /^\s*<[a-z]{0,9}$/i.test(buffer)) return out;
        started = started || buffer.trim().length > 0;
        out += buffer;
        buffer = '';
        return out;
      }
    },
    flush() { const rest = inside ? '' : buffer; buffer = ''; return rest; },
  };
}

/** Converts the Workers AI SSE stream into the site's own event stream. */
export function relayStream(upstream, meta) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const filter = createThinkFilter();
  let pending = '';
  let sawText = false;
  let raw = '';
  const event = payload => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(event({ type: 'meta', ...meta }));
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (raw.length < 600) raw += chunk;
          pending += chunk;
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            let parsed;
            try { parsed = JSON.parse(data); } catch { continue; }
            if (parsed.error || parsed.errors) throw new Error(detailOf(parsed.error || parsed.errors));
            const piece = chunkText(parsed);
            if (piece) {
              const text = filter.push(piece);
              if (text) { sawText = true; controller.enqueue(event({ type: 'delta', text })); }
            }
          }
        }
        const rest = filter.flush();
        if (rest) { sawText = true; controller.enqueue(event({ type: 'delta', text: rest })); }
        if (!sawText) {
          controller.enqueue(event({ type: 'error', message: MESSAGES.upstream, detail: `No answer text in the model stream. First bytes: ${detailOf(raw) || '(empty)'}` }));
        } else {
          controller.enqueue(event({ type: 'done' }));
        }
      } catch (error) {
        controller.enqueue(event({ type: 'error', message: classifyUpstreamError(error).message, detail: detailOf(error) }));
      } finally {
        controller.close();
      }
    },
  });
}

async function readJson(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > LIMITS.bodyBytes) throw Object.assign(new Error('Request too large.'), { status: 413 });
  const text = await request.text();
  if (text.length > LIMITS.bodyBytes) throw Object.assign(new Error('Request too large.'), { status: 413 });
  try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('Send JSON.'), { status: 400 }); }
}

export async function handleRequest(request, env = {}, ctx = {}, deps = {}) {
  const cors = corsHeaders(request, env);
  const url = new URL(request.url);
  const model = env.MODEL || DEFAULT_MODEL;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, model, configured: Boolean(env.AI) }, 200, cors);
  if (request.method === 'GET' && url.pathname === '/probe') {
    // A tiny real call that reveals the model's response shape or error text. Costs a few neurons.
    if (!env.AI) return json({ ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, 503, cors);
    const address = request.headers.get('CF-Connecting-IP') || '';
    if (!(await withinLimit(address ? `ip:${address}` : '', env, deps, LIMITS.perAddress, false))) return json({ ok: false, error: 'rate_limited' }, 429, cors);
    try {
      const result = await runQuietly(env.AI, model, { messages: [{ role: 'user', content: 'Reply with exactly the single word: OK' }], max_completion_tokens: LIMITS.probeTokens });
      return json({ ok: true, model, text: extractText(result).slice(0, 200), shape: detailOf(result) }, 200, cors);
    } catch (error) {
      return json({ ok: false, model, error: detailOf(error) }, 502, cors);
    }
  }
  if (request.method !== 'POST' || !['/ask', '/logic'].includes(url.pathname)) return json({ error: 'not_found', message: 'Not found.' }, 404, cors);
  if (!cors['Access-Control-Allow-Origin'] && request.headers.get('Origin')) return json({ error: 'forbidden', message: 'This origin may not use the tutor.' }, 403, cors);
  if (!env.AI) return json({ error: 'unconfigured', message: MESSAGES.unconfigured }, 503, cors);

  let body;
  try { body = await readJson(request); }
  catch (error) { return json({ error: 'bad_request', message: error.message }, error.status || 400, cors); }

  const address = request.headers.get('CF-Connecting-IP') || '';
  const browser = clientId(request) || (address ? `addr:${address}` : '');
  const allowed = await withinLimit(browser, env, deps) && await withinLimit(address ? `ip:${address}` : '', env, deps, LIMITS.perAddress, false);
  if (!allowed) return json({ error: 'rate_limited', message: MESSAGES.rateLimited }, 429, { ...cors, 'Retry-After': '60' });

  if (url.pathname === '/logic') {
    let prepared;
    try { prepared = buildLogicRequest(String(body.difficulty || '')); }
    catch (error) { return json({ error: 'bad_request', message: error.message }, 400, cors); }
    try {
      // Structured-output mode is not used: with this model it stalls in its reasoning phase.
      // The prompt asks for a bare JSON object and the site validates it strictly.
      const result = await runQuietly(env.AI, model, { messages: prepared.messages, max_completion_tokens: prepared.max_tokens, temperature: 0.4 });
      const text = stripThinking(extractText(result)).trim();
      if (!text) throw Object.assign(new Error('The model returned no text.'), { detail: detailOf(result) });
      return json({ problem: text }, 200, cors);
    } catch (error) {
      const failure = classifyUpstreamError(error);
      return json({ error: failure.code, message: failure.message, detail: error?.detail || detailOf(error) }, failure.status, cors);
    }
  }

  const question = cleanQuestion(body.question);
  if (!question) return json({ error: 'bad_request', message: 'Enter a question first.' }, 400, cors);
  const prepared = buildAskRequest(question);
  try {
    const upstream = await runQuietly(env.AI, model, { messages: prepared.messages, max_completion_tokens: LIMITS.answerTokens, temperature: 0.3, stream: true });
    if (!(upstream instanceof ReadableStream)) {
      const text = stripThinking(extractText(upstream)).trim();
      if (!text) throw Object.assign(new Error('The model returned no text.'), { detail: detailOf(upstream) });
      return json({ answer: text, resources: prepared.resources }, 200, cors);
    }
    return new Response(relayStream(upstream, { resources: prepared.resources, model }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    });
  } catch (error) {
    const failure = classifyUpstreamError(error);
    return json({ error: failure.code, message: failure.message, detail: error?.detail || detailOf(error) }, failure.status, cors);
  }
}
