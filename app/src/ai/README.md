# Local AI integration

Pin `@mlc-ai/web-llm` to `0.2.85` in the app package. Wrap the router's shared layout in `AiProvider` once. Render `<LocalAIPage resources={catalog} reviewedContent={excerpts} />` at `/local-ai`.

`useAI()` returns `status`, `progress` (`{progress: 0..1, text}` or null), `error` (readable string), `modelId`, `enabled`, `ready`, `busy`, and `enable`, `generate`, `stop`, `unload`, `clearCache`.

- `enable(): Promise<string | false>` checks compatibility and explicitly downloads/loads the selected model. False means unsupported. Nothing loads on initial render. Concurrent enable calls share one operation.
- `generate({system, prompt, maxTokens, responseFormat?}): Promise<string>` requires a ready model. Overlapping operations reject with `BusyError`. Input/output limits bound memory and response time. Optional `responseFormat: {type: 'json_object', schema: JSON.stringify(schema)}` uses WebLLM's grammar-constrained JSON mode; only type/schema are forwarded. Callers must still validate the returned object and handle truncation or semantic mistakes.
- `stop()` cancels loading/generation and terminates the worker. A following enable can reuse completed cached artifacts. Pending requests reject with `AbortError`; late replies cannot revive the engine.
- `unload(): Promise<void>` releases graphics memory and keeps browser cache.
- `clearCache(): Promise<void>` unloads and removes the two supported model variants only. It does not clear student drafts or progress.
- `ready` remains true during generation, while `busy` prevents another request. `enabled` means an engine is currently loaded. Compatibility/loading/clearing count as busy.

The catalog prop is an array of `{id, title, desc, section, route?, file?, type?}`. Related links come exclusively from safe catalog routes or `resources/` files. Optional reviewed study excerpts are `{resourceId, title, text}`. Their resourceId must match an actual catalog id. Retrieval scores titles above body text and includes at most three 700-character excerpts; matching excerpts bring their catalog resources into the related links. This label does not claim human/teacher approval. Download descriptions are not treated as full PDF contents. UI renders generated text literally, without HTML or Markdown link interpretation. The current chat is held only in page memory.

Default: `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`; fallback without shader-f16: `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`. Initial f16 download is approximately 0.9 GB; model files stay on external model hosts, not in the repository. Both variants need WebGPU and substantial graphics memory; no remote paid inference fallback exists.

Offline controller/grounding tests: `node --test tests/ai.test.mjs` from the repository root. Real-browser verification must additionally cover the production subdirectory worker URL, initial download, cached reload, generation, cancellation, and unsupported devices. Synthetic tests do not verify model quality or GPU compatibility.

References: https://webllm.mlc.ai/docs/user/advanced_usage.html and https://github.com/mlc-ai/web-llm/blob/main/src/web_worker.ts
