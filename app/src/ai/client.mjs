// Browser client for the EduResources tutor Worker. No key, no model download:
// the browser sends a question and receives a streamed answer.
const abortError = () => Object.assign(new Error('Stopped.'), { name: 'AbortError' });
const busyError = () => Object.assign(new Error('Please wait for the current answer to finish.'), { name: 'BusyError' });

const FALLBACK_MESSAGES = {
  network: 'The tutor could not be reached. Check your connection and try again.',
  bad: 'The tutor returned something unexpected. Try again in a moment.',
  timeout: 'That answer took too long and was stopped. Try a shorter question.',
};

/** Parses one text/event-stream body, calling onEvent for each JSON payload. */
export async function readEventStream(body, onEvent, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    for (;;) {
      if (signal?.aborted) throw abortError();
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const chunks = pending.split(/\n\n/);
      pending = chunks.pop() ?? '';
      for (const chunk of chunks) {
        for (const line of chunk.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          let parsed;
          try { parsed = JSON.parse(data); } catch { continue; }
          onEvent(parsed);
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

/** A random id per browser so fair-use limits apply per person, not per school network. Not an account. */
export function browserId(storage) {
  const key = 'eduresources.tutor.client.v1';
  const make = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    const existing = store?.getItem(key);
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
    const fresh = make();
    store?.setItem(key, fresh);
    return fresh;
  } catch { return make(); }
}

/** The day's remaining questions, as last reported by the Worker, kept per browser so a reload still shows it. */
const DAILY_KEY = 'eduresources.tutor.daily.v1';
const utcDay = (now = Date.now()) => Math.floor(now / 86_400_000);
export function readDaily(storage, now) {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    const saved = JSON.parse(store?.getItem(DAILY_KEY) || 'null');
    if (saved && saved.day === utcDay(now) && Number.isInteger(saved.remaining) && Number.isInteger(saved.allowance)) return { remaining: saved.remaining, allowance: saved.allowance };
  } catch { /* storage unavailable or malformed */ }
  return { remaining: null, allowance: null };
}
function writeDaily(storage, daily, now) {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    store?.setItem(DAILY_KEY, JSON.stringify({ day: utcDay(now), ...daily }));
  } catch { /* best effort */ }
}

export function createTutorClient({ endpoint = '', fetch: fetchImpl, timeoutMs = 90_000, clientId, storage } = {}) {
  const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
  const id = clientId || browserId(storage);
  const base = String(endpoint || '').replace(/\/+$/, '');
  let state = { status: 'idle', busy: false, error: '', detail: '', configured: Boolean(base), ...readDaily(storage) };
  let controller = null;
  const listeners = new Set();
  const publish = patch => { const next = { ...state, ...patch }; state = { ...next, busy: next.status === 'generating' }; listeners.forEach(fn => fn(state)); };
  const noteDaily = body => {
    if (!body || !Number.isInteger(body.remaining) || !Number.isInteger(body.allowance)) return;
    const daily = { remaining: Math.max(0, body.remaining), allowance: body.allowance };
    writeDaily(storage, daily);
    publish(daily);
  };

  async function post(path, payload, signal) {
    if (!base) throw new Error('The tutor is not connected yet.');
    let response;
    try {
      response = await doFetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tutor-Client': id }, body: JSON.stringify(payload), signal });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw Object.assign(new Error(FALLBACK_MESSAGES.network), { name: 'NetworkError' });
    }
    if (!response.ok) {
      let message = FALLBACK_MESSAGES.bad;
      let code = 'error';
      let detail = '';
      try {
        const body = await response.json();
        message = body.message || message; code = body.error || code; detail = typeof body.detail === 'string' ? body.detail : '';
        if (code === 'daily_limit') noteDaily(body);
      } catch { /* non-JSON error */ }
      throw Object.assign(new Error(message), { name: 'TutorError', code, status: response.status, detail });
    }
    return response;
  }

  function begin() {
    if (controller) throw busyError();
    controller = new AbortController();
    const timer = setTimeout(() => controller?.abort(Object.assign(new Error(FALLBACK_MESSAGES.timeout), { name: 'TimeoutError' })), timeoutMs);
    publish({ status: 'generating', error: '' });
    return { signal: controller.signal, end() { clearTimeout(timer); controller = null; } };
  }

  function settle(error) {
    if (!error) { publish({ status: 'idle', error: '', detail: '' }); return; }
    if (error.name === 'AbortError') { publish({ status: 'idle', error: '', detail: '' }); return; }
    if (error.name === 'TimeoutError') { publish({ status: 'error', error: FALLBACK_MESSAGES.timeout, detail: '' }); return; }
    publish({ status: 'error', error: error.message || FALLBACK_MESSAGES.bad, detail: typeof error.detail === 'string' ? error.detail : '' });
  }

  /** Streams an answer. onDelta receives text as it arrives; resolves with the whole exchange. */
  async function ask(question, { onDelta } = {}) {
    const text = String(question || '').trim();
    if (!text) throw new Error('Enter a question first.');
    const run = begin();
    let answer = '';
    let resources = [];
    try {
      const response = await post('/ask', { question: text }, run.signal);
      const type = response.headers.get('Content-Type') || '';
      if (type.includes('text/event-stream') && response.body) {
        let failure = null;
        await readEventStream(response.body, event => {
          if (event.type === 'meta') { if (Array.isArray(event.resources)) resources = event.resources; noteDaily(event); }
          else if (event.type === 'delta' && typeof event.text === 'string') { answer += event.text; onDelta?.(answer); }
          else if (event.type === 'error') failure = Object.assign(new Error(event.message || FALLBACK_MESSAGES.bad), { name: 'TutorError', detail: typeof event.detail === 'string' ? event.detail : '' });
        }, run.signal);
        if (failure && !answer.trim()) throw failure;
      } else {
        const body = await response.json();
        answer = String(body.answer || '');
        resources = Array.isArray(body.resources) ? body.resources : [];
        noteDaily(body);
        onDelta?.(answer);
      }
      if (!answer.trim()) throw Object.assign(new Error(FALLBACK_MESSAGES.bad), { name: 'TutorError' });
      run.end();
      settle(null);
      return { answer: answer.trim(), resources };
    } catch (error) {
      const failure = run.signal.aborted && run.signal.reason?.name === 'TimeoutError' ? run.signal.reason : error;
      run.end();
      settle(failure);
      throw failure;
    }
  }

  function stop() {
    if (!controller) return;
    controller.abort(abortError());
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    ask, stop,
    dispose() { stop(); listeners.clear(); },
  };
}
