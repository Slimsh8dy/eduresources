# Sapere aude - philosophy study resources

A static philosophy, ethics, and theology site with searchable resources, an essay planner, flashcards, logic practice, original practice questions, and an optional browser-local AI assistant.

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

No API key, cloud account, environment secret, paid inference server, or model installation on the developer's computer is required. `npm ci` needs an internet connection to fetch pinned dependencies. Browsing the site does not download the AI model until the visitor explicitly enables it.

## What lives where

| Location | Purpose |
| --- | --- |
| `app/index.html`, `app/src/` | Editable Vite/React application source. |
| `app/src/resources/catalog.js` | Single resource catalogue with stable IDs, routes, topic metadata, and review notes. |
| `app/src/resources/questionData.json` | Shared source for the browser question bank and printable practice pack. |
| `app/src/learning/` | Planner, logic practice, flashcards, reviewed content, and local saved-state helpers. |
| `app/src/ai/` | Lazy WebLLM worker, compatibility/loading controls, and local study assistant. |
| `dist/` | Intermediate Vite build, not the GitHub Pages publishing root. |
| Root `index.html` and `assets/` | Generated files committed for static GitHub Pages hosting. Do not hand-edit these. |
| `resources/` | Existing PDFs and WAV audio, plus the new original printable practice pack. |
| `scripts/publish-build.mjs` | Copies only the new generated HTML and assets into the publishing root. |
| `tests/` | Content, state, AI-controller, catalogue, and original-asset protection checks. |
| `docs/CONTENT-REVIEW.md` | Corrections, provenance limitations, and caveats in legacy materials. |

The application uses hash routes (for example, `#/flashcards`) so direct links work on static hosting. The configured base URL is `/eduresources/`.

## Source recovery and publication

The previous deployed `gh-pages` revision was `d66d244edc276b7cfc7cb527e9d6cb107769fd0e`. It contained generated bundles and source maps but not a maintained source/build workflow. The original application source was recovered from those source maps before this upgrade. The recovery utility is retained as historical tooling; **do not run it over the current application**, because it would replace newer source with the old recovered version.

`npm run build` builds `app/`, then copies the generated `dist/index.html` and `dist/assets/` into the repository root. This changes local files only; it does not push to GitHub. Existing `resources/`, including every audio recording and duplicate file, are left untouched. Old generated asset files are retained so older links and rollback builds remain available.

GitHub Pages publishes the root of `gh-pages`. For an update, work on a review branch, run the tests/build/preview, inspect the generated diff, and include both the source changes and generated root HTML/assets in the reviewed commit. Publish the approved commit to `gh-pages` through the usual repository workflow, then verify the live subdirectory URL and AI worker loading. Do not publish the raw `app/index.html` as the root page.

Tests preserve the original 58 PDF/audio filenames, the complete tracked resource inventory, and immutable SHA-256 checks for the six linked WAV files and their duplicate copies. Audio changes are outside this upgrade's scope.

### Restore an earlier release

Use a clean checkout and identify the exact upgrade commit in `git log`. Revert that commit with `git revert COMMIT_SHA`, resolve and review any conflicts, and publish the resulting revert commit through the normal workflow. A merge commit requires selecting the correct mainline parent; review its history before reverting it. This preserves history and restores the prior generated page without a force push. Do not use a hard reset to discard unrelated work. Always check the restored live site afterward.

## Use the free local AI

“Local” means the model runs on each visitor's compatible device. GitHub Pages serves static files; it does not run an AI server. The integration uses WebLLM 0.2.85 with **Qwen2.5 1.5B Instruct**.

1. Open **Local AI** in the site navigation.
2. Read the download and compatibility notice. Select **Enable local AI - download model** only when ready for the download.
3. Wait for the model to become ready, then ask one focused study question. Other study tools remain usable without AI.

The first model download is approximately **0.9 GB**; the compatibility variant may be larger. A compatible WebGPU browser, working graphics acceleration, sufficient memory, and available browser storage are needed. Not every browser, phone, or computer can run it. Loading can take several minutes and graphics performance varies; a successful compatibility check does not guarantee enough memory for every task.

The default model is `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`. Where `shader-f16` is unavailable, the integration selects `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`. Model weights are downloaded from Hugging Face, and compiled model support comes from MLC's public hosting; the repository does not contain the model weights.

- **Cancel loading** or **Stop answer** stops the worker. Enable it again to retry; completed cached downloads can be reused.
- **Unload AI from memory** releases graphics memory while keeping the model download cached.
- **Remove downloaded model** unloads and removes the supported model variants from the app's model cache. It does not delete the planner draft or study progress.
- **Clear this conversation** removes the visible chat on the current page. Chat is held in page memory rather than saved as study progress.

The browser may evict cached files, and private browsing or blocked storage can prevent reuse. A later visit may require another download. This is not an offline-first app: do not assume the complete site and every asset will work without a connection.

There is no per-message inference fee or automatic paid fallback. Downloads still use data, electricity, device resources, and contact the external file hosts. Questions are processed in the browser, not sent to a remote inference API. Do not include sensitive personal information. Model output can be wrong; check claims against course materials and primary sources. It does not officially grade work or claim to have read all linked PDFs. Related links come from the site's catalogue rather than invented model URLs.

Model information: [original Qwen model and license](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE), [MLC f16 model](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC), [MLC f32 model](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f32_1-MLC). See `app/src/ai/README.md` for the integration contract and real-browser verification checklist.

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
