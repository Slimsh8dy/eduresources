// EduResources tutor — Cloudflare Worker logic.
// The Worker owns the prompts and grounding, so the browser only ever sends a question.
// AI is used for one thing only: tutoring replies to a pupil's question (POST /ask).
// Nothing here stores a key: the model is reached through the Workers AI binding (env.AI).
// Limits (LIMITS below): 1,500-character questions, 1,000-token replies, 3 a minute and 10 a day per browser.
import { RESOURCES } from '../../app/src/resources/catalog.js';
import { REVIEWED_EXCERPTS } from '../../app/src/ai/excerpts.js';
import { studyContext } from '../../app/src/ai/grounding.mjs';

export const DEFAULT_MODEL = '@cf/openai/gpt-oss-120b';
export const DEFAULT_ORIGINS = ['https://slimsh8dy.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];
export const LIMITS = Object.freeze({
  questionChars: 1500,  // about 350–400 tokens of English, or 250 words: room for a question, not an essay
  bodyBytes: 8 * 1024,
  // The reply budget. A model that reasons privately first spends part of this on that reasoning.
  answerTokens: 1000,
  probeTokens: 400,
  perVisitor: { limit: 3, period: 60 },        // per browser (client id); the LIMITER binding carries the same limit when present
  perVisitorDay: { limit: 10, period: 86400 }, // per browser per UTC day, counted in the Cache API (best effort)
  perAddress: { limit: 40, period: 60 },       // per network address, so a whole classroom behind one address is not treated as one visitor
});

const MESSAGES = Object.freeze({
  quota: 'The tutor has used up today’s free allowance for everyone. It resets at midnight UTC (1 a.m. during British Summer Time). The rest of the site works as usual.',
  rateLimited: 'You are asking faster than the tutor can fairly serve. Wait a minute and ask again.',
  dailyLimit: `You have asked your ${LIMITS.perVisitorDay.limit} questions for today. The tutor resets at midnight UTC (1 a.m. during British Summer Time). The flashcards, logic problems and essay planner are always available.`,
  tooLong: `Your question is too long. Keep it under ${LIMITS.questionChars.toLocaleString('en-GB')} characters (about 250 words): ask about one point rather than pasting a whole essay.`,
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

/** Best-effort counter in the Cache API: one bucket per key per period (a UTC day when the period is 86400). */
async function cacheCount(store, key, { limit, period }, now) {
  const bucket = Math.floor(now / (period * 1000));
  const url = `https://ratelimit.eduresources.invalid/${encodeURIComponent(key)}/${period}/${bucket}`;
  const cached = await store.default.match(url);
  const count = cached ? Number(await cached.text()) || 0 : 0;
  if (count >= limit) return { allowed: false, count };
  await store.default.put(url, new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${period}` } }));
  return { allowed: true, count: count + 1 };
}

/** Counts one use against a rule and says how many remain. Best effort: the Cache API is per data
 *  centre and may forget, so this is a fairness measure, not a security one. */
export async function useAllowance(key, env, deps = {}, rule = LIMITS.perVisitorDay) {
  const open = { allowed: true, count: 0, remaining: rule.limit };
  if (!key) return open;
  const store = deps.caches || globalThis.caches;
  if (!store?.default) return open;
  try {
    const result = await cacheCount(store, key, rule, deps.now ? deps.now() : Date.now());
    return { ...result, remaining: Math.max(0, rule.limit - result.count) };
  } catch { return open; }
}

/** Returns true when the visitor is within the per-visitor limit. Best effort by design. */
export async function withinLimit(key, env, deps = {}, rule = LIMITS.perVisitor, useBinding = true) {
  if (!key) return true;
  if (useBinding && env.LIMITER && typeof env.LIMITER.limit === 'function') {
    try { const { success } = await env.LIMITER.limit({ key }); return success !== false; }
    catch { return true; }
  }
  return (await useAllowance(key, env, deps, rule)).allowed;
}

export function clientId(request) {
  const raw = request.headers.get('X-Tutor-Client') || '';
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : '';
}

export function cleanQuestion(value) {
  if (typeof value !== 'string') return '';
  // Drop control characters (newlines and tabs are kept), then trim. Length is judged by the caller,
  // so an over-long question gets a message rather than a silently shortened answer.
  const keep = ch => { const code = ch.charCodeAt(0); return !(code < 32 && code !== 9 && code !== 10 && code !== 13) && code !== 127; };
  return Array.from(value).filter(keep).join('').trim();
}

export function buildAskRequest(question) {
  const context = studyContext(question, RESOURCES, REVIEWED_EXCERPTS);
  const resources = context.resources.map(r => ({ id: r.id, title: r.title, type: r.type, route: r.route || null, file: r.file || null }));
  return {
    resources,
    messages: [{ role: 'system', content: context.system.slice(0, 8000) }, { role: 'user', content: question }],
  };
}

/** Models the tutor may run on, with how each one's hidden reasoning can be kept out of the answer budget.
 *  quiet: 'responses' — OpenAI's gpt-oss models: the Responses API shape with reasoning.effort, falling back
 *                       to chat messages with reasoning_effort; "Reasoning: low" is also stated in the prompt;
 *         'template'  — the OpenAI-style schema documents reasoning_effort and chat_template_kwargs (enable_thinking);
 *         'effort'    — only reasoning_effort applies; 'prompt' — Qwen3's soft switch, "/no_think" in the user turn;
 *         'none'      — an instruct model that does not reason privately. The list also bounds /probe?model=. */
export const CANDIDATE_MODELS = Object.freeze({
  '@cf/openai/gpt-oss-120b': { quiet: 'responses', label: 'gpt-oss-120b' },
  '@cf/openai/gpt-oss-20b': { quiet: 'responses', label: 'gpt-oss-20b' },
  '@cf/google/gemma-4-26b-a4b-it': { quiet: 'template', label: 'Gemma 4 26B' },
  '@cf/zai-org/glm-4.7-flash': { quiet: 'template', label: 'GLM-4.7 Flash' },
  '@cf/zai-org/glm-5.3-flash': { quiet: 'template', label: 'GLM-5.3 Flash' },
  '@cf/deepseek-ai/deepseek-v4-flash-0731': { quiet: 'template', label: 'DeepSeek V4 Flash' },
  '@cf/nvidia/nemotron-3-120b-a12b': { quiet: 'template', label: 'Nemotron 3 120B' },
  '@cf/qwen/qwen3-30b-a3b-fp8': { quiet: 'prompt', label: 'Qwen3 30B-A3B' },
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { quiet: 'none', label: 'Llama 3.3 70B' },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { quiet: 'none', label: 'Llama 4 Scout' },
  '@cf/mistralai/mistral-small-3.1-24b-instruct': { quiet: 'none', label: 'Mistral Small 3.1 24B' },
  '@cf/meta/llama-3.1-8b-instruct-fast': { quiet: 'none', label: 'Llama 3.1 8B' },
});
export function modelProfile(model) {
  return CANDIDATE_MODELS[model] || { quiet: 'template', label: String(model || '') };
}

export const EFFORT = 'low';

/** Request options that every Workers AI text model accepts: both spellings of the token budget are sent
 *  (the older schemas read max_tokens, default 256; the OpenAI-style ones read max_completion_tokens). */
export function requestOptions(model, messages, budget, extra = {}) {
  const profile = modelProfile(model);
  let turns = messages;
  if (profile.quiet === 'prompt') {
    const last = messages.length - 1;
    turns = messages.map((m, i) => (i === last && m.role === 'user' ? { ...m, content: `${m.content} /no_think` } : m));
  }
  if (profile.quiet === 'responses') {
    // gpt-oss reads its reasoning level from the system text as well as from the API field.
    turns = messages.map((m, i) => (i === 0 && m.role === 'system' && !/^Reasoning: /.test(m.content) ? { ...m, content: `Reasoning: ${EFFORT}\n\n${m.content}` } : m));
  }
  return { messages: turns, max_tokens: budget, max_completion_tokens: budget, ...extra };
}

/** The same request in the Responses API shape (input, instructions, reasoning.effort, max_output_tokens). */
export function responsesShape(options) {
  const { messages = [], max_tokens, max_completion_tokens, reasoning_effort, chat_template_kwargs, ...rest } = options;
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const input = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
  const budget = max_completion_tokens ?? max_tokens;
  return { ...rest, ...(system ? { instructions: system } : {}), input, reasoning: { effort: EFFORT }, ...(budget ? { max_output_tokens: budget } : {}) };
}

/** Reasoning models think privately before they answer, and the thinking counts against the token budget.
 *  These knobs ask for as little of it as possible. If the platform rejects a knob the model's schema lacks,
 *  the call is retried without it, and finally with the plain options only. */
export const QUIET = Object.freeze({ reasoning_effort: EFFORT, chat_template_kwargs: { enable_thinking: false } });
const looksLikeSchemaRejection = error => /chat_template_kwargs|reasoning_effort|reasoning|max_completion_tokens|max_output_tokens|instructions|input|messages|additional propert|unknown|unexpected|invalid|schema|not allowed|validation|required/i.test(String(error?.message || ''));
export function attemptsFor(model, options) {
  const profile = modelProfile(model);
  const attempts = [];
  if (profile.quiet === 'responses') attempts.push(responsesShape(options));
  if (profile.quiet === 'template') attempts.push({ ...options, ...QUIET });
  if (profile.quiet === 'template' || profile.quiet === 'effort' || profile.quiet === 'responses') attempts.push({ ...options, reasoning_effort: EFFORT });
  attempts.push(options);
  const { max_completion_tokens, ...older } = options;
  attempts.push(older);
  return attempts;
}
export async function runQuietly(ai, model, options) {
  let lastError;
  for (const attempt of attemptsFor(model, options)) {
    try { return await ai.run(model, attempt); }
    catch (error) {
      lastError = error;
      if (!looksLikeSchemaRejection(error)) throw error;
    }
  }
  throw lastError;
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
  if (Array.isArray(result.output)) {
    // Responses-API shape: message items carrying output_text parts.
    return result.output.filter(item => item?.type === 'message' && Array.isArray(item.content))
      .flatMap(item => item.content).filter(part => part?.type === 'output_text' && typeof part.text === 'string')
      .map(part => part.text).join('');
  }
  return '';
}

/** What a finished (non-streamed) result says about how it ended: finish reason and token usage. */
export function outcomeOf(result) {
  const choice = result?.choices?.[0];
  let reasoningChars = typeof choice?.message?.reasoning_content === 'string' ? choice.message.reasoning_content.length : 0;
  if (Array.isArray(result?.output)) {
    for (const item of result.output) {
      if (item?.type !== 'reasoning') continue;
      for (const part of [...(item.summary || []), ...(item.content || [])]) if (typeof part?.text === 'string') reasoningChars += part.text.length;
    }
  }
  return {
    finish: choice?.finish_reason ?? result?.incomplete_details?.reason ?? result?.status ?? null,
    usage: result?.usage ?? null,
    reasoningChars,
  };
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
  let finish = null;
  let usage = null;
  let reasoningChars = 0;
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
            if (parsed.error || parsed.errors || parsed.type === 'response.failed' || parsed.type === 'error') throw new Error(detailOf(parsed.error || parsed.errors || parsed.response?.error || parsed));
            const choice = parsed.choices?.[0];
            if (choice?.finish_reason) finish = choice.finish_reason;
            if (parsed.usage) usage = parsed.usage;
            if (typeof choice?.delta?.reasoning_content === 'string') reasoningChars += choice.delta.reasoning_content.length;
            // Responses API events: reasoning text streams separately; completion carries status and usage.
            if (/^response\.reasoning/.test(parsed.type || '') && typeof parsed.delta === 'string') reasoningChars += parsed.delta.length;
            if ((parsed.type === 'response.completed' || parsed.type === 'response.incomplete') && parsed.response) {
              finish = parsed.response.incomplete_details?.reason || parsed.response.status || finish;
              usage = parsed.response.usage || usage;
            }
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
          const ending = `finish_reason ${finish || 'unknown'}; hidden reasoning ${reasoningChars} characters; usage ${usage ? JSON.stringify(usage) : 'unknown'}`;
          controller.enqueue(event({ type: 'error', message: MESSAGES.upstream, detail: `No answer text in the model stream (${ending}). First bytes: ${detailOf(raw).slice(0, 160) || '(empty)'}` }));
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
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({
      ok: true, model, label: modelProfile(model).label, quiet: modelProfile(model).quiet, effort: EFFORT, configured: Boolean(env.AI),
      limiter: Boolean(env.LIMITER),
      limits: { questionChars: LIMITS.questionChars, answerTokens: LIMITS.answerTokens, perMinute: LIMITS.perVisitor.limit, perDay: LIMITS.perVisitorDay.limit },
    }, 200, cors);
  }
  if (request.method === 'GET' && url.pathname === '/probe') {
    // One real, non-streamed call that reveals how a model behaves: its text, how it finished and what it
    // cost. ?model= tries another model from CANDIDATE_MODELS; ?q= asks a real question with the real
    // tutor prompt instead of the one-word check. Costs neurons like any question.
    if (!env.AI) return json({ ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, 503, cors);
    const address = request.headers.get('CF-Connecting-IP') || '';
    if (!(await withinLimit(address ? `ip:${address}` : '', env, deps, LIMITS.perAddress, false))) return json({ ok: false, error: 'rate_limited' }, 429, cors);
    const requested = url.searchParams.get('model') || '';
    if (requested && !CANDIDATE_MODELS[requested]) return json({ ok: false, error: 'bad_request', message: 'Unknown model.', models: Object.keys(CANDIDATE_MODELS) }, 400, cors);
    const target = requested || model;
    const question = cleanQuestion(url.searchParams.get('q') || '').slice(0, LIMITS.questionChars);
    const messages = question ? buildAskRequest(question).messages : [{ role: 'user', content: 'Reply with exactly the single word: OK' }];
    const started = Date.now();
    try {
      const result = await runQuietly(env.AI, target, requestOptions(target, messages, question ? LIMITS.answerTokens : LIMITS.probeTokens, question ? { temperature: 0.3 } : {}));
      const text = stripThinking(extractText(result)).trim();
      return json({ ok: Boolean(text), model: target, ms: Date.now() - started, text: text.slice(0, 900), ...outcomeOf(result), shape: detailOf(result).slice(0, 240) }, 200, cors);
    } catch (error) {
      return json({ ok: false, model: target, ms: Date.now() - started, error: detailOf(error) }, 502, cors);
    }
  }
  if (request.method !== 'POST' || url.pathname !== '/ask') return json({ error: 'not_found', message: 'Not found.' }, 404, cors);
  if (!cors['Access-Control-Allow-Origin'] && request.headers.get('Origin')) return json({ error: 'forbidden', message: 'This origin may not use the tutor.' }, 403, cors);
  if (!env.AI) return json({ error: 'unconfigured', message: MESSAGES.unconfigured }, 503, cors);

  let body;
  try { body = await readJson(request); }
  catch (error) { return json({ error: 'bad_request', message: error.message }, error.status || 400, cors); }

  const question = cleanQuestion(body.question);
  if (!question) return json({ error: 'bad_request', message: 'Enter a question first.' }, 400, cors);
  if (question.length > LIMITS.questionChars) return json({ error: 'too_long', message: MESSAGES.tooLong, limit: LIMITS.questionChars }, 400, cors);

  const address = request.headers.get('CF-Connecting-IP') || '';
  const browser = clientId(request) || (address ? `addr:${address}` : '');
  const allowed = await withinLimit(browser, env, deps) && await withinLimit(address ? `ip:${address}` : '', env, deps, LIMITS.perAddress, false);
  if (!allowed) return json({ error: 'rate_limited', message: MESSAGES.rateLimited }, 429, { ...cors, 'Retry-After': '60' });
  const daily = await useAllowance(browser, env, deps, LIMITS.perVisitorDay);
  if (!daily.allowed) return json({ error: 'daily_limit', message: MESSAGES.dailyLimit, remaining: 0, allowance: LIMITS.perVisitorDay.limit }, 429, cors);

  const prepared = buildAskRequest(question);
  const meta = { resources: prepared.resources, model, remaining: daily.remaining, allowance: LIMITS.perVisitorDay.limit };
  try {
    const upstream = await runQuietly(env.AI, model, requestOptions(model, prepared.messages, LIMITS.answerTokens, { temperature: 0.3, stream: true }));
    if (!(upstream instanceof ReadableStream)) {
      const text = stripThinking(extractText(upstream)).trim();
      if (!text) throw Object.assign(new Error('The model returned no text.'), { detail: detailOf(upstream) });
      return json({ answer: text, ...meta }, 200, cors);
    }
    return new Response(relayStream(upstream, meta), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    });
  } catch (error) {
    const failure = classifyUpstreamError(error);
    return json({ error: failure.code, message: failure.message, detail: error?.detail || detailOf(error) }, failure.status, cors);
  }
}
