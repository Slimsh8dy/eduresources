# Sapere aude - philosophy study resources

A static philosophy, ethics, and theology site with searchable resources, an essay planner, flashcards, logic practice, original practice questions, and an optional AI tutor served by a small Cloudflare Worker. AI is used for one purpose only: answering a pupil's study question on the tutor page. All study content is reviewed and fixed; nothing on the site is AI-generated.

- Site: [slimsh8dy.github.io/eduresources](https://slimsh8dy.github.io/eduresources/)
- Repository: [Slimsh8dy/eduresources](https://github.com/Slimsh8dy/eduresources)
- Clean clone URL: `https://github.com/Slimsh8dy/eduresources.git`

## Run and test locally

Use Node.js **22.12.0 or newer** and npm. Start in a clean checkout so that existing work is not overwritten.

```sh
git clone https://github.com/Slimsh8dy/eduresources.git
cd eduresources
npm ci
npm test
npm run build
npm run preview
```

Open [http://localhost:4173/eduresources/](http://localhost:4173/eduresources/). The preview binds only to the local machine. It serves the generated static site; rebuild after editing source. Stop it with Ctrl+C. Do not open the HTML directly with a `file:` URL.

No API key, paid inference server, or model installation is required. `npm ci` needs an internet connection to fetch pinned dependencies. The AI tutor needs one free Cloudflare account to host the Worker in `worker/`; see below.

## What lives where

| Location | Purpose |
| --- | --- |
| `app/index.html`, `app/src/` | Editable Vite/React application source. |
| `app/src/resources/catalog.js` | Single resource catalogue with stable IDs, routes, topic metadata, and review notes. |
| `app/src/resources/questionData.json` | Shared source for the browser question bank and printable practice pack. |
| `app/src/learning/` | Planner, logic practice, flashcards, reviewed content, and local saved-state helpers. |
| `app/src/ai/` | Tutor page, the browser client for the Worker, grounding (catalogue and reviewed excerpts), and `config.js` with the Worker URL. |
| `worker/` | The Cloudflare Worker that answers tutor questions with Workers AI. `worker/dist/tutor.js` is the single-file bundle for pasting into the Cloudflare dashboard. |
| `dist/` | Intermediate Vite build, not the GitHub Pages publishing root. |
| Root `index.html` and `assets/` | Generated files committed for static GitHub Pages hosting. Do not hand-edit these. |
| `resources/` | Existing PDFs and WAV audio, plus the new original printable practice pack. |
| `scripts/publish-build.mjs` | Copies only the new generated HTML and assets into the publishing root. |
| `tests/` | Content, state, tutor client, Worker, catalogue, and original-asset protection checks. |
| `docs/CONTENT-REVIEW.md` | Corrections, provenance limitations, and caveats in legacy materials. |

The application uses hash routes (for example, `#/flashcards`) so direct links work on static hosting. The configured base URL is `/eduresources/`.

## Source recovery and publication

The previous deployed `gh-pages` revision was `d66d244edc276b7cfc7cb527e9d6cb107769fd0e`. It contained generated bundles and source maps but not a maintained source/build workflow. The original application source was recovered from those source maps before this upgrade. The recovery utility is retained as historical tooling; **do not run it over the current application**, because it would replace newer source with the old recovered version.

`npm run build` builds `app/`, then copies the generated `dist/index.html` and `dist/assets/` into the repository root. This changes local files only; it does not push to GitHub. Existing `resources/`, including every audio recording and duplicate file, are left untouched. Old generated asset files are retained so older links and rollback builds remain available.

GitHub Pages publishes the root of `gh-pages`. For an update, work on a review branch, run the tests/build/preview, inspect the generated diff, and include both the source changes and generated root HTML/assets in the reviewed commit. Publish the approved commit to `gh-pages` through the usual repository workflow, then verify the live subdirectory URL and AI worker loading. Do not publish the raw `app/index.html` as the root page.

Tests preserve the original 58 PDF/audio filenames, the complete tracked resource inventory, and immutable SHA-256 checks for the six linked WAV files and their duplicate copies. Audio changes are outside this upgrade's scope.

### Restore an earlier release

Use a clean checkout and identify the exact upgrade commit in `git log`. Revert that commit with `git revert COMMIT_SHA`, resolve and review any conflicts, and publish the resulting revert commit through the normal workflow. A merge commit requires selecting the correct mainline parent; review its history before reverting it. This preserves history and restores the prior generated page without a force push. Do not use a hard reset to discard unrelated work. Always check the restored live site afterward.

## The AI tutor

The tutor page sends a question to a small Cloudflare Worker (`worker/`). The Worker adds the relevant catalogue descriptions and reviewed excerpts, asks OpenAI's open-weight **gpt-oss-120b** model through Cloudflare Workers AI with its reasoning effort set to low, and streams the answer back. The browser never holds a key, and no key is stored anywhere in this repository: the Worker reaches the model through a binding. Cloudflare's free plan includes 10,000 Workers AI "neurons" a day, shared by every visitor; when they are used up the tutor says so and the rest of the site is unaffected.

Fair-use limits, all enforced by the Worker: a question may be at most 1,500 characters (about 250 words, roughly 350–400 tokens); a reply is capped at 1,000 tokens, which for a reasoning model includes its private reasoning; each visitor may ask three questions a minute and ten a day; and a separate ceiling of 40 requests a minute applies per network address so a classroom is not counted as one person. "Visitor" means a random id the browser keeps, not an account, so the daily count is a fairness measure rather than a security one (it is kept in Cloudflare's cache, per data centre, and a visitor who clears site data starts afresh). The page shows the questions left today and asks visitors not to include personal information.

### Deploy the Worker (once)

1. Create a free account at https://dash.cloudflare.com/sign-up.
2. In the dashboard choose **Workers & Pages → Create → Start with Hello World**, name it `eduresources-tutor`, and deploy the placeholder.
3. Open the Worker, choose **Edit code**, replace the contents of the editor with `worker/dist/tutor.js` from this repository, and **Deploy**.
4. In the Worker's **Settings → Bindings**, add a **Workers AI** binding with the variable name `AI`. Optionally add a **Rate limiting** binding named `LIMITER` (3 requests per 60 seconds); without it the Worker falls back to a best-effort per-visitor limit of its own. Visitors are told apart by a random id their browser keeps (not an account), so a whole class behind one school address is not treated as one visitor; a separate ceiling of 40 requests a minute applies per address.
5. Optional: under **Settings → Variables**, add `ALLOWED_ORIGINS` (comma-separated site origins) if the site ever moves; `https://slimsh8dy.github.io` is allowed by default.
6. Copy the Worker's URL (`https://eduresources-tutor.<your-subdomain>.workers.dev`) into `DEFAULT_ENDPOINT` in `app/src/ai/config.js`, rebuild, and publish the site.

Developers can instead run `npx wrangler deploy` inside `worker/` (it reads `worker/wrangler.jsonc`). After changing anything under `worker/src/`, run `npm run build:worker` to regenerate the single-file bundle.

### Changing the model

The Worker runs whichever model the `MODEL` variable names (**Settings → Variables**); without one it uses gpt-oss-120b. The models it knows how to drive are listed in `CANDIDATE_MODELS` in `worker/src/tutor.js`, each with the way its private "thinking" is kept out of the answer budget (thinking otherwise counts against the tokens allowed for the reply, and a model that thinks for too long returns no answer at all). Two spellings of the token budget are sent so that older and newer Workers AI schemas both honour it. The tutor page shows the model's name from the Worker's `/health` reply, so no site rebuild is needed when the model changes.

Before switching, try a candidate with the real tutor prompt: `GET /probe?model=<model id>&q=<a question>` runs one non-streamed call and reports the text, how the call finished (`finish`), token usage, hidden-reasoning size and time taken. Only listed models are accepted. Each probe costs neurons like a question.

Model information: [gpt-oss-120b on Workers AI](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/) (Apache-2.0 open weights from OpenAI). The Worker asks for it in the Responses API shape (`input`, `instructions`, `reasoning.effort`, `max_output_tokens`) and falls back to chat messages if the platform prefers them. Cloudflare states that it does not use Workers AI content to train models; questions are still processed on Cloudflare's servers, so the page asks visitors not to include personal information. Model output can be wrong; check claims against course materials and primary sources. The tutor does not grade work and has not read the linked PDFs; related links come from the site's catalogue rather than from the model.

## Saved work and practice questions

Essay drafts, flashcard review choices, logic attempts, and personal resource ratings use browser-local storage, where available. They are **not an account, backup, or cross-device sync**. The interface shows when saving is unavailable. Clearing site data, switching browser/profile, or using another device can remove or hide saved work. Export important essay plans as text or print/save them as PDF, including unfinished drafts.

The new question bank is original study material, not an official exam paper, prediction, or mark scheme. Legacy PDF compilations remain available with their limitations labelled. When editing `questionData.json`, regenerate its PDF with Python and ReportLab:

```sh
python3 scripts/build-practice-pdf.py
```

Then render and inspect every PDF page, run `npm test`, and rebuild the site. Keep the browser and printable versions consistent.

## Security and third-party materials

Never put a token, password, private key, or API key in a remote URL, source file, generated bundle, commit, or client-side environment variable. Client-side code is public. Use GitHub's normal credential manager or repository tools for authenticated publishing.

See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for software and model notices. Those notices **do not relicense** the original PDFs, audio, quotations, or linked external resources; their owners retain their rights.
