# Release verification — Cloudflare tutor and minimal interface (13 September 2026)

Decision (13 Sep, late): AI-generated logic problems were removed. The AI tutor exists only to clarify a pupil's question; the twelve reviewed logic problems are the whole set. The Worker exposes `POST /ask` (and `GET /health`, `GET /probe`) only.

Built in a fresh clone of `gh-pages` on a review branch. The interface was restyled (one ground, hairline rules, ink only; no card boxes; one filled primary control per view) without removing any feature. The browser-local WebLLM tutor was replaced by a Cloudflare Worker that calls Workers AI (`@cf/google/gemma-4-26b-a4b-it`) with the grounding prompt built server-side.

## Automated checks

- `npm test`: 54 tests passed (content, state, ratings, catalogue/asset protection, tutor client, Worker).
- Worker tests cover CORS allow/refuse and preflight, streamed meta/delta/done events, stripping of `<think>` blocks across chunk boundaries, input limits enforced before any model call, the per-visitor limit keyed by a per-browser id (Cache-API fallback and rate-limit binding) with a separate per-address ceiling so a classroom behind one address is not one visitor, the daily-allowance quota message, structured-output request with fallback, and health/unconfigured responses.
- Client tests cover the unconfigured state, streamed deltas and catalogue links, surfaced server messages, refusal of overlapping requests, stop/abort, timeouts, logic-problem generation, and chunk-split event parsing.
- `npm run build` and `npm run build:worker` both pass; the Worker bundle is a single dependency-free file.

## End-to-end checks (real Worker code in Node with a fake Workers AI binding)

- A question on the tutor page streams word by word, the hidden reasoning block is never shown, and the related-resource links come from the catalogue.
- A fourth request within a minute from the same address is refused with the fair-use message; the fifth after the window succeeds.
- The daily-allowance error from the model becomes the plain "used up today's free allowance" message.
- No console errors on the home, topic, tutor, logic, essay and search views at 1280 px and 400 px widths.

## Not verified here

- The live Workers AI response quality and latency of Gemma 4 26B, and whether it accepts `response_format: json_schema` (the Worker falls back to plain generation if not).
- The exact wording of Cloudflare's quota error; the Worker matches several likely forms.
- Whether the Rate limiting binding can be added from the dashboard on the Free plan; the fallback limiter covers its absence.

---

# Release verification — September 2026

This update was built in an isolated copy of the published `gh-pages` branch.
The pre-existing local checkout and all its uncommitted/conflicted work were left alone.

## Automated checks

- `npm test`: 44 tests passed before release.
- `npm run build`: production build passed with `/eduresources/` asset paths.
- Dependency installation reported no known vulnerabilities at verification time.
- All catalog destinations exist, with unique resource IDs and known routes.
- Every original resource remains. Original audio files, including duplicate copies, match the immutable deployed SHA-256 baseline.
- Storage tests cover reload, blocked/quota-limited storage, corrupt data, future versions, ratings migration, and avoiding implicit overwrites.
- AI tests cover unsupported devices, f16/f32 selection, shared loads, serialization, cancellation/races, timeouts, safe catalog links, bounded relevant excerpts, and schema-constrained generation.
- Generated exercise validation rejects malformed JSON, nested/list explanations, incomplete fields, invalid premise labels and untrusted saved link metadata.
- Export tests confirm incomplete work and literal markup-like text are preserved safely.

## Browser checks

- Shared navigation, route titles, a single main landmark and page heading, and route-focus handling.
- Search finds the previously missing epistemology PDFs and exposes all tools/resources.
- A personal rating entered in search is reflected on the matching topic card.
- A filtered practice question enters an empty planner; a later question offers a choice instead of overwriting an existing draft.
- Direct essay navigation, all 25 prompts in outline view, draft persistence after reload, and unfinished text export.
- Flashcard reveal, Unsure rating, review queue and persisted review after reload.
- Logic initial answer, worked example, revised answer and persisted revision after reload.
- Light and dark themes; 390 CSS-pixel mobile layout without horizontal overflow on the home, flashcard and planner views.
- Actual WebGPU model download, cancellation/retry, and a local inference response. The returned modus-tollens form was correct.
- Invalid generated exercise content was rejected rather than displayed. A strict JSON-schema constraint was added in response to this real-model test.
- The final real-model retry produced a schema-valid modus-tollens exercise with a correct distinction between validity and soundness. The worked example rendered and remained labelled as AI-generated, unchecked practice.
- The cached model was enabled again after reload. Same-route search-result navigation closes the search panel correctly.

## Content and limits

The three-page original practice PDF was rendered and every page visually inspected. The browser and PDF question bank share one data file.

The browser test uses one compatible desktop GPU. It does not establish support on every device, mobile GPU, browser or managed school network. Unsupported-device and timeout behaviour are covered by injected tests, not real-device certification. Local AI can still be philosophically wrong despite structurally valid JSON: generated exercises remain visibly labelled as unchecked, and the 12 reviewed core problems work without AI.

See `CONTENT-REVIEW.md` for corrected explanations and caveats in legacy source material. No audio content, encoding or player configuration was changed.
