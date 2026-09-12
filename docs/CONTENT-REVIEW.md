# Content review and provenance

Review date: 12 September 2026. Baseline: published `gh-pages` revision `d66d244edc276b7cfc7cb527e9d6cb107769fd0e`.

This update makes specific corrections and improves how materials are labelled and used. It is **not** a claim that every statement in every existing PDF has been independently verified. No existing PDF or audio has been rewritten or removed. The six linked WAV files and their duplicate copies are protected by immutable SHA-256 checks in `tests/site.test.mjs`.

## Reviewed teaching changes

The interactive logic explanations distinguish formal validity, truth of premises, and independent justification. In particular:

- Problem 8, circular reasoning: supplies the missing bridge before claiming validity and explains why soundness does not itself require independently established premises. Circular justification can be unpersuasive even where a valid argument has true premises.
- Problem 10, sorites: makes the repeated classical inference explicit, distinguishes competing responses to vagueness, and corrects the claim that supervaluationism preserves classical logic only in clear cases.
- Problem 11, conditional chain: a counterexample to `P → Q` requires `P` and `not-Q`; `Q` without `P` challenges necessity, not sufficiency. Contested premises are not labelled false merely because a student disagrees.
- Problem 12, categorical inference: standardises the displayed form as `All M are P; no S are M; therefore no S are P`, correctly labels illicit major, and supplies a true-premise/false-conclusion counterexample.
- Flashcard 24: replaces the broad, poorly attributed “Anscombe's Epistemic Objection” with a more specific account of intended versus foreseen consequences and the deliberate punishment of the innocent. Its source is Anscombe's *Modern Moral Philosophy* (1958).
- Essay planning: objections can lead to concession, qualification, or revision; a final synthesis weighs the argument cycles. A complete-looking plan is not automatically a good argument.

The interactive content links to sources. Students should still check quotations, definitions, and course-specific expectations with their teacher and primary texts.

## Original practice bank

`resources/Practice-Questions-Reviewed.pdf` and the browser question bank derive from the same source, `app/src/resources/questionData.json`. They contain 27 original prompts across Natural Law, Situation Ethics, Kantian Ethics, Utilitarianism, Euthanasia, Business Ethics, Metaethics, Conscience, and Sexual Ethics.

These are study prompts, not official examination questions, predictions, a current specification, or a marking scheme. The five-part checklist covers focus, understanding, analysis, evaluation, and justified judgement without assigning a numerical grade.

Quality review:

- Questions ask students to explain relevant distinctions and defend a judgement, not to repeat a predetermined conclusion.
- Comparison prompts ask why views differ; they do not assume that sharing a concern with outcomes makes two theories identical.
- Conditional and metaethical questions separate an assertion from the reasons offered for it and request missing premises where needed.
- Applied questions distinguish moral judgement from legality, popularity, and sincerity. End-of-life prompts are philosophical exercises, not medical or legal advice.
- Sexual-ethics prompts use respectful language, foreground freely given informed consent, and allow examination of further ethical considerations without implying that an additional criterion replaces consent.
- Students are prompted to formulate an opposing argument fairly and acknowledge uncertainty or limits. No thinker is treated as automatically correct.

The three-page PDF was rendered and every page visually checked for legibility, clipping, spacing, and page numbering. The original captured question pack remains available separately.

## Newly discoverable materials and caveats

The catalogue now exposes the following 13 existing, nonduplicate PDFs with meaningful titles. Descriptions were checked against the PDFs; full scholarly or assessment verification has not been completed.

| Existing filename | Catalogue identity and caution |
| --- | --- |
| `Natural-Law-notes.pdf` | Natural Law - Moral & Legal Theory. Strong focus on legal theory; not simply a guide to Aquinas's normative ethics. Select relevant sections for the course. |
| `NL-for-against.pdf` | Natural Law - For & Against. Includes legal-theory applications; do not transfer claims about jurisprudence uncritically into an ethics essay. |
| `Situation-Ethics-1.pdf` | Situation Ethics - Decision-Making Essay 1. Discussion essay of undocumented authorship/assessment status. Challenge any inference from genetic self-interest to the denial of human altruism. |
| `Situation-Ethics-2.pdf` | Situation Ethics - Decision-Making Essay 2. Its claims about Dawkins, “selfish genes”, and inevitable human selfishness should not be relied on as established science. An ethical “ought” also does not follow merely from a claim about what is natural. |
| `Kant-extra.pdf` | Kantian Ethics - Extended Reading. Existing compilation, not independently fact-checked. Maintain the distinction between acting in accordance with duty and acting from duty. |
| `Utilitarianism-extra.pdf` | Utilitarianism - Extended Reading. Existing compilation, not independently fact-checked. Check quotations, historical claims, and contested interpretations against cited originals. |
| `GS-1.pdf` | Christian Gender Roles - Critical Essay. Discussion essay, not an endorsed model answer. Avoid treating all Christian traditions or historical periods as uniform. |
| `GS-2.pdf` | Mulieris Dignitatem - Critical Essay. Discusses John Paul II's letter and gender roles; authorship and assessment status are undocumented. Check attribution and the original letter. |
| `GT-1.pdf` | Mary Daly & Gendered Language - Essay 1. Defends a feminist criticism of masculine language for God; an argument to assess, not a settled verdict on all Christian theology. |
| `GT-2.pdf` | Mary Daly & Gendered Language - Essay 2. Presents an alternative response. Rejecting or questioning a premise is not, by itself, the formal fallacy of denying the antecedent. |
| `Ethics-mind-map.pdf` | Ethics - Overview Map. A simplified one-page orientation to normative, applied, and metaethics, not a complete taxonomy. |
| `Ethics-Questions.pdf` | Legacy Ethics Question Compilation. Unofficial; attribution, difficulty labels, specification alignment, and prediction claims have not been verified. |
| `Christianity-exam-questions.pdf` | Legacy Christianity Question Compilation. Unofficial; not an official OCR paper or verified prediction of exam content. |

`Exam-Questions.pdf`, the previously linked captured third-party pack, is also retained with a visible legacy/unofficial label. Its page-navigation material and prediction language have not been presented as authoritative. The new practice bank is original material, not a cleaned reprint of that third-party text.

Files ending in ` 2.pdf` remain on disk but are not duplicated in search. Their retention preserves old links; catalogue de-duplication is not deletion. Existing introductory PDFs, revision notes, mind maps, podcasts, and audio links remain available. Podcast inclusion describes the existing links, not a fresh transcript-level accuracy audit.

## AI limitations

The optional language model is a study aid, not a scholarly authority or a grading service. The reviewed question bank, flashcards, logic problems, and original PDFs remain distinguishable from generated text. Model answers can be incomplete or wrong; students should check factual claims and sources and should not enter sensitive personal information.

## Maintenance

Run `npm test` after changing content. Rebuild the printable pack with `python3 scripts/build-practice-pdf.py` (requires ReportLab) whenever the shared question source changes, then render and inspect every page again. Do not change the audio baselines as part of routine site updates; any future audio work needs separate scope approval.
