export const WEBLLM_VERSION = '0.2.85';
export const MODEL_IDS = {
  f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
};

const abortError = () => Object.assign(new Error('Local AI stopped.'), { name: 'AbortError' });
const busyError = () => Object.assign(new Error('Please wait for the current AI operation to finish.'), { name: 'BusyError' });

function checkedResponseFormat(format) {
  if (format == null) return null;
  if (typeof format !== 'object' || Array.isArray(format) || format.type !== 'json_object') {
    throw new Error('Local AI structured output requires the json_object response format.');
  }
  const result = { type: 'json_object' };
  if (format.schema !== undefined) {
    if (typeof format.schema !== 'string' || format.schema.length > 20_000) throw new Error('The output schema must be a JSON string shorter than 20,000 characters.');
    let schema;
    try { schema = JSON.parse(format.schema); } catch { throw new Error('The output schema is not valid JSON.'); }
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('The output schema must describe a JSON object.');
    result.schema = JSON.stringify(schema);
  }
  // Do not spread caller-supplied options: only the supported format fields reach the engine.
  return result;
}

function readableError(error) {
  const message = typeof error?.message === 'string' ? error.message : String(error || 'Unknown error');
  if (/quota|storage.*(full|exceed)/i.test(message)) return 'There is not enough browser storage for the model. Free some space and try again.';
  if (/fetch|network|download|load failed/i.test(message)) return 'The model could not be downloaded. Check your connection and whether your network allows Hugging Face and GitHub downloads, then retry.';
  if (/gpu|out of memory|device.*lost|buffer.*size/i.test(message)) return 'The graphics device could not run this model. Close other graphics-heavy tabs and retry, or use a compatible device. All ordinary study tools remain available.';
  if (/timed out/i.test(message)) return message;
  return 'Local AI could not complete that operation. Please enable it again and retry.';
}

/** Browser-only defaults are lazy so unsupported browsers can use the whole site. */
const browserDependencies = {
  getNavigator: () => globalThis.navigator,
  loadRuntime: () => import('@mlc-ai/web-llm'),
  createWorker: () => new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' }),
};

/** One controller per app, not per tool. Dependencies are injectable for offline tests. */
export function createLocalAIClient(overrides = {}) {
  const dependencies = { ...browserDependencies, ...overrides };
  const loadTimeout = overrides.loadTimeout ?? 10 * 60_000;
  const generationTimeout = overrides.generationTimeout ?? 180_000;
  let state = { status: 'idle', progress: null, error: '', modelId: '', enabled: false, ready: false, busy: false };
  let engine = null;
  let worker = null;
  let operation = null;
  let enablePromise = null;
  let disposed = false;
  const listeners = new Set();

  function publish(patch) {
    if (disposed) return;
    state = { ...state, ...patch };
    state.enabled = Boolean(engine);
    state.ready = Boolean(engine) && (state.status === 'ready' || state.status === 'generating');
    state.busy = ['checking', 'loading', 'generating', 'clearing'].includes(state.status);
    listeners.forEach(listener => listener(state));
  }

  function terminate() {
    try { engine?.interruptGenerate(); } catch { /* The worker may already be gone. */ }
    worker?.terminate();
    engine = null;
    worker = null;
  }

  function begin(timeoutMs, timeoutMessage) {
    if (operation) throw busyError();
    let rejectCancellation;
    const token = {
      cancelled: false,
      cancellation: new Promise((_, reject) => { rejectCancellation = reject; }),
      cancel(reason = abortError()) {
        if (token.cancelled) return;
        token.cancelled = true;
        rejectCancellation(reason);
      },
    };
    // Attach a handler immediately, even while an asynchronous compatibility check runs.
    token.cancellation.catch(() => {});
    token.timer = setTimeout(() => token.cancel(new Error(timeoutMessage)), timeoutMs);
    operation = token;
    return token;
  }

  const current = token => operation === token && !token.cancelled && !disposed;
  async function waitFor(token, promise) {
    const result = await Promise.race([promise, token.cancellation]);
    if (!current(token)) throw abortError();
    return result;
  }
  function finish(token) {
    clearTimeout(token.timer);
    if (operation === token) operation = null;
  }

  function stop() {
    operation?.cancel();
    if (operation) clearTimeout(operation.timer);
    operation = null;
    enablePromise = null;
    terminate();
    publish({ status: 'idle', progress: null, error: '' });
  }

  async function enable() {
    if (disposed) throw abortError();
    if (enablePromise) return enablePromise;
    if (engine && !operation) return state.modelId;
    if (operation) throw busyError();
    const token = begin(loadTimeout, 'Loading the model timed out. Check your connection and retry; completed downloads may be reused.');
    publish({ status: 'checking', error: '', progress: null });
    const task = (async () => {
      try {
        const browser = dependencies.getNavigator();
        if (!browser?.gpu) {
          publish({ status: 'unsupported', error: 'This browser does not provide WebGPU. Try an up-to-date compatible browser with graphics acceleration enabled. Ordinary search and study tools still work.' });
          return false;
        }
        const adapter = await waitFor(token, browser.gpu.requestAdapter());
        if (!adapter) {
          publish({ status: 'unsupported', error: 'A compatible graphics device is not available to this browser. Ordinary search and study tools still work.' });
          return false;
        }
        const modelId = adapter.features.has('shader-f16') ? MODEL_IDS.f16 : MODEL_IDS.f32;
        publish({ status: 'loading', modelId, progress: { progress: 0, text: 'Preparing the local model…' } });
        const runtime = await waitFor(token, dependencies.loadRuntime());
        worker = dependencies.createWorker();
        worker.onerror = () => token.cancel(new Error('The AI worker could not start.'));
        const loaded = await waitFor(token, runtime.CreateWebWorkerMLCEngine(worker, modelId, {
          initProgressCallback: report => {
            if (current(token)) publish({ progress: {
              progress: Math.min(1, Math.max(0, Number(report.progress) || 0)),
              text: String(report.text || 'Loading model…'),
            } });
          },
        }, { context_window_size: 4096 }));
        engine = loaded;
        worker.onerror = () => {
          if (operation) operation.cancel(new Error('The AI worker stopped unexpectedly.'));
          else {
            terminate();
            publish({ status: 'error', error: 'Local AI stopped unexpectedly. Enable it again to continue.', progress: null });
          }
        };
        publish({ status: 'ready', progress: { progress: 1, text: 'Model ready on this device.' }, error: '' });
        return modelId;
      } catch (error) {
        if (operation === token) {
          terminate();
          publish({ status: error.name === 'AbortError' ? 'idle' : 'error', error: error.name === 'AbortError' ? '' : readableError(error), progress: null });
        }
        throw error;
      } finally {
        finish(token);
      }
    })();
    enablePromise = task;
    try { return await task; }
    finally { if (enablePromise === task) enablePromise = null; }
  }

  async function generate({ system = '', prompt = '', maxTokens = 400, responseFormat } = {}) {
    if (!String(prompt).trim()) throw new Error('Enter a question first.');
    if (operation) throw busyError();
    if (!engine || disposed) throw new Error('Enable local AI before asking a question.');
    const format = checkedResponseFormat(responseFormat);
    const token = begin(generationTimeout, 'This answer took too long, so local AI was stopped. Enable it again and try a shorter question.');
    const activeEngine = engine;
    publish({ status: 'generating', error: '' });
    try {
      const response = await waitFor(token, activeEngine.chat.completions.create({
        messages: [
          { role: 'system', content: (String(system).slice(0, 6200) || 'Give concise, careful philosophy study help. Acknowledge uncertainty.')
            + (format ? '\nReturn ONLY a JSON object that follows the required output schema. Put explanations in the required string fields; do not include Markdown fences or text outside the object.' : '') },
          { role: 'user', content: String(prompt).trim().slice(0, 1800) },
        ],
        temperature: 0.2,
        max_tokens: Math.min(1400, Math.max(32, Number(maxTokens) || 400)),
        stream: false,
        ...(format ? { response_format: format } : {}),
      }));
      const content = response?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('The model returned no answer.');
      publish({ status: 'ready', error: '' });
      return content.trim();
    } catch (error) {
      if (operation === token) {
        terminate();
        publish({ status: error.name === 'AbortError' ? 'idle' : 'error', error: error.name === 'AbortError' ? '' : readableError(error), progress: null });
      }
      throw error;
    } finally {
      finish(token);
    }
  }

  async function unload() {
    const previousEngine = engine;
    // In-flight operations need immediate termination rather than waiting behind inference.
    if (operation) { stop(); return; }
    if (previousEngine) {
      const token = begin(3000, 'Unloading timed out.');
      publish({ status: 'clearing', error: '' });
      try { await waitFor(token, previousEngine.unload()); } catch { /* Terminate below. */ }
      // A stop followed by a new enable must not let this older unload destroy it.
      const stillOwnsEngine = operation === token;
      finish(token);
      if (!stillOwnsEngine) return;
    }
    terminate();
    publish({ status: 'idle', progress: null, error: '' });
  }

  async function clearCache() {
    await unload();
    if (disposed) throw abortError();
    const token = begin(30_000, 'Removing downloaded files timed out. You can also clear this site’s storage in your browser settings.');
    publish({ status: 'clearing', error: '' });
    try {
      const runtime = await waitFor(token, dependencies.loadRuntime());
      // Clear both supported variants; no unrelated website data is touched.
      for (const id of Object.values(MODEL_IDS)) {
        await waitFor(token, runtime.deleteModelAllInfoInCache(id));
      }
      publish({ status: 'idle', modelId: '', progress: null, error: '' });
    } catch (error) {
      if (operation === token) publish({ status: 'error', error: readableError(error) });
      throw error;
    } finally { finish(token); }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    enable, generate, stop, unload, clearCache,
    dispose() { stop(); disposed = true; listeners.clear(); },
  };
}
