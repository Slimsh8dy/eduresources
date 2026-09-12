// The stable id is shared by search, topic pages, and local ratings.
// Existing assets are preserved; catalogue descriptions are not endorsements.
const revision = '/philosophy-ethics-revision';
const questions = '/philosophy-ethics-questions';
const pdf = (id, title, name, topic, route, desc, tags = [], reviewNote = '') => ({
  id, title, desc, route, file: `resources/${name}.pdf`, type: 'pdf',
  section: topic === 'Logic' ? 'Logic' : topic === 'Introduction' ? 'Introduction' : topic === 'Practice questions' ? 'Practice questions' : `Philosophy, ethics & theology › ${topic}`,
  topic, tags: ['reading', 'pdf', ...tags], ...(reviewNote ? { reviewNote } : {}),
});
const audio = (id, title, name, topic, route, desc) => ({
  id, title, desc, route, file: `resources/${name}.wav`, type: 'audio',
  section: `Philosophy, ethics & theology › ${topic}`, topic, tags: ['audio', 'listen'],
});
const podcast = (id, title, url, topic, route) => ({
  id, title, desc: 'BBC Radio 4 podcast episode.', route, file: null, url,
  type: 'external', section: `Philosophy, ethics & theology › ${topic}`, topic, tags: ['podcast', 'listen', 'BBC'],
});
const draft = 'Existing discussion essay; author and assessment status are not documented. Read critically, not as an endorsed model answer.';
const legacy = 'Legacy third-party compilation. Its exam-board and prediction claims have not been verified; it is not an official past paper or current specification.';

export const RESOURCES = [
  pdf('intro-epistemology', 'Introduction to Epistemology', 'epistemology_introduction', 'Introduction', '/intro-philosophy-ethics', 'A foundational introduction to the theory of knowledge.', ['knowledge', 'justification']),
  pdf('intro-moral-epistemology', 'Introduction to Moral Epistemology', 'moral_epistemology_introduction', 'Introduction', '/intro-philosophy-ethics', 'An introduction to moral knowledge and ethical justification.', ['knowledge', 'ethics']),
  pdf('logic-introduction', 'Introduction to Logic', 'Introduction-to-Logic', 'Logic', '/philosophy-fundamentals', 'Foundational logic concepts and techniques.', ['validity', 'soundness', 'arguments']),
  pdf('logic-oxbridge', 'Oxbridge Logic Preparation', 'Oxbridge-Logic-Preparation', 'Logic', '/philosophy-fundamentals', 'Existing logic preparation exercises; not an official admissions publication.', ['admissions', 'arguments']),
  pdf('utilitarianism-notes', 'Utilitarianism — Revision Notes', 'Utilitarianism', 'Utilitarianism', `${revision}/utilitarianism`, 'Concise notes on core utilitarian ideas and key distinctions.', ['Bentham', 'Mill', 'consequences']),
  pdf('utilitarianism-arguments', 'Utilitarianism — For & Against', 'Utilitarianism-For-Against', 'Utilitarianism', `${revision}/utilitarianism`, 'Arguments in favour of and against utilitarianism.', ['evaluation', 'Bentham', 'Mill']),
  pdf('utilitarianism-extended', 'Utilitarianism — Extended Reading', 'Utilitarianism-extra', 'Utilitarianism', `${revision}/utilitarianism`, 'A longer overview of the development, principles, and criticisms of utilitarianism.', ['Sidgwick', 'consequentialism'], 'Existing source compilation, not independently fact-checked. Check quotations and interpretive claims against the cited originals.'),
  audio('bentham-intro-audio', 'Bentham — Intro', 'Bentham-intro', 'Utilitarianism', `${revision}/utilitarianism`, "Short introduction to Bentham's version of utilitarianism."),
  audio('bentham-evaluation-audio', 'Bentham — Strengths & Weaknesses', 'Bentham-strengths-weaknesses', 'Utilitarianism', `${revision}/utilitarianism`, "Key advantages and criticisms of Bentham's approach."),
  audio('mill-summary-audio', 'Mill — Summary', 'Mill-summary', 'Utilitarianism', `${revision}/utilitarianism`, "Brief overview of J. S. Mill's refinements to utilitarianism."),
  audio('utilitarianism-debate-audio', 'Defender–Challenger', 'Defender-Challenger', 'Utilitarianism', `${revision}/utilitarianism`, 'A defender of utilitarianism versus a challenger.'),
  podcast('utilitarianism-podcast', 'In Our Time — Utilitarianism', 'https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660', 'Utilitarianism', `${revision}/utilitarianism`),
  pdf('kant-main-concepts', 'Kant — Main Concepts', 'Kant-Main-Concepts', 'Kantianism', `${revision}/kantianism`, 'Good will, duty, maxims, and the Categorical Imperative.', ['Kant', 'deontology']),
  pdf('kant-extended', 'Kantian Ethics — Extended Reading', 'Kant-extra', 'Kantianism', `${revision}/kantianism`, 'An existing review of Kantian principles, supporting arguments, and objections.', ['Kant', 'autonomy', 'duty'], 'Existing source compilation, not independently fact-checked. Distinguish acting in accordance with duty from acting from duty.'),
  audio('kant-overview-1-audio', 'Kant — SEP Overview (Part 1)', 'Kant-SEP1', 'Kantianism', `${revision}/kantianism`, 'A short overview aligned to SEP themes (part 1).'),
  audio('kant-overview-2-audio', 'Kant — SEP Overview (Part 2)', 'Kant-SEP2', 'Kantianism', `${revision}/kantianism`, 'Continuation of the SEP-aligned overview (part 2).'),
  podcast('kant-podcast', 'In Our Time — Kant', 'https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000392533436', 'Kantianism', `${revision}/kantianism`),
  pdf('augustine-notes', 'Augustine — Notes', 'Augustine-Notes', 'Augustine', `${revision}/augustine`, "Selected notes on Augustine's theology.", ['grace', 'original sin', 'human nature']),
  pdf('paul-reflections', 'Reflections — Paul', 'Reflections-Paul', 'Augustine', `${revision}/augustine`, "Pauline reflections related to Augustine's themes.", ['Christianity', 'Paul']),
  pdf('kierkegaard-original-sin', 'Kierkegaard — Original Sin', 'Kierkegaard-Original-Sin', 'Augustine', `${revision}/augustine`, 'Kierkegaard on sin and responsibility.', ['Kierkegaard', 'Christianity']),
  podcast('augustine-podcast', 'In Our Time — Augustine of Hippo', 'https://podcasts.apple.com/gb/podcast/in-our-time-religion/id463701224?i=1000406479219', 'Augustine', `${revision}/augustine`),
  pdf('natural-law-notes', 'Natural Law — Moral & Legal Theory', 'Natural-Law-notes', 'Natural Law', `${revision}/natural-law`, 'An extended revision guide, with a strong emphasis on natural law as legal theory.', ['Aquinas', 'law', 'reason', 'telos'], 'This guide is wider than Aquinas’s ethical theory. Use the relevant sections and check your course requirements.'),
  pdf('natural-law-arguments', 'Natural Law — For & Against', 'NL-for-against', 'Natural Law', `${revision}/natural-law`, 'Supporting arguments and objections, including legal-theory applications.', ['Aquinas', 'evaluation', 'law'], 'Existing summary, not independently fact-checked; legal-theory claims need care when used in an ethics essay.'),
  pdf('situation-ethics-essay-1', 'Situation Ethics — Decision-Making Essay 1', 'Situation-Ethics-1', 'Situation Ethics', `${revision}/situation-ethics`, 'A discussion essay assessing situation ethics as a method of moral decision-making.', ['Fletcher', 'agape', 'essay'], `${draft} Challenge any inference from genetic self-interest to a denial of human altruism.`),
  pdf('situation-ethics-essay-2', 'Situation Ethics — Decision-Making Essay 2', 'Situation-Ethics-2', 'Situation Ethics', `${revision}/situation-ethics`, 'A second discussion essay presenting objections to situation ethics.', ['Fletcher', 'agape', 'essay'], `${draft} Its claims about Dawkins and unavoidable selfishness should not be relied on as established science.`),
  pdf('gender-roles-essay', 'Christian Gender Roles — Critical Essay', 'GS-1', 'Gender & theology', `${revision}/gender-theology`, 'An essay exploring Christian gender roles, equality, and interpretations of scripture.', ['gender', 'Christianity', 'GS-1', 'essay'], draft),
  pdf('mulieris-dignitatem-essay', 'Mulieris Dignitatem — Critical Essay', 'GS-2', 'Gender & theology', `${revision}/gender-theology`, 'An assessment of the views on dignity and gender roles in John Paul II’s letter.', ['gender', 'John Paul II', 'GS-2', 'essay'], draft),
  pdf('daly-theology-essay-1', 'Mary Daly & Gendered Language — Essay 1', 'GT-1', 'Gender & theology', `${revision}/gender-theology`, 'An essay defending a feminist criticism of masculine language for God.', ['Mary Daly', 'Trible', 'GT-1', 'essay'], draft),
  pdf('daly-theology-essay-2', 'Mary Daly & Gendered Language — Essay 2', 'GT-2', 'Gender & theology', `${revision}/gender-theology`, 'An alternative response exploring non-gendered readings of God and scripture.', ['Mary Daly', 'Trible', 'GT-2', 'essay'], `${draft} Distinguish challenging a conditional’s premise from the formal fallacy called denying the antecedent.`),
  pdf('metaethics-cognitivism-map', 'Metaethics — Cognitivism', 'Metaethics-Cognitivism', 'Metaethics', '/philosophy-ethics-mind-maps', 'An overview of cognitivist positions in metaethics.', ['mind map', 'moral language']),
  pdf('metaethics-noncognitivism-map', 'Metaethics — Non-Cognitivism', 'Metaethics-Non-Cognitivism', 'Metaethics', '/philosophy-ethics-mind-maps', 'An overview of non-cognitivist positions in metaethics.', ['mind map', 'moral language']),
  pdf('ethics-overview-map', 'Ethics — Overview Map', 'Ethics-mind-map', 'Metaethics', '/philosophy-ethics-mind-maps', 'A one-page map distinguishing normative ethics, applied ethics, and metaethics.', ['mind map', 'normative ethics', 'applied ethics']),
  pdf('practice-questions-reviewed', 'Philosophy & Ethics — Practice Questions', 'Practice-Questions-Reviewed', 'Practice questions', questions, 'Original questions across nine topics with a practical self-review checklist. Not an official exam paper.', ['essay', 'practice', 'reviewed']),
  pdf('legacy-exam-questions', 'Legacy Exam-Question Compilation', 'Exam-Questions', 'Practice questions', questions, 'The original captured third-party question pack, retained for reference.', ['legacy', 'OCR', 'exam'], legacy),
  pdf('legacy-ethics-questions', 'Legacy Ethics Question Compilation', 'Ethics-Questions', 'Practice questions', questions, 'An existing compilation of ethics prompts grouped by topic and difficulty.', ['legacy', 'OCR', 'exam'], legacy),
  pdf('legacy-christianity-questions', 'Legacy Christianity Question Compilation', 'Christianity-exam-questions', 'Practice questions', questions, 'An existing compilation covering Augustine and other Christianity topics.', ['legacy', 'OCR', 'Christianity', 'Augustine', 'exam'], legacy),
  { id: 'tool-essay-planner', title: 'Essay Planner', desc: 'Develop a question, argument, objection, response, and reasoned conclusion; save a draft on this device.', route: '/philosophy-basics', file: null, type: 'tool', section: 'Study tools', topic: 'Writing', tags: ['essay', 'plan', 'scaffold', 'export'] },
  { id: 'tool-logic-practice', title: 'Logic Practice', desc: 'Work through reviewed arguments, compare a solution, and revise your reasoning.', route: '/philosophy-fundamentals/logic-problems', file: null, type: 'tool', section: 'Study tools', topic: 'Logic', tags: ['logic', 'validity', 'soundness', 'practice'] },
  { id: 'tool-flashcards', title: 'Flashcards', desc: 'Retrieve ideas from memory and build a local review queue.', route: '/flashcards', file: null, type: 'tool', section: 'Study tools', topic: 'Revision', tags: ['revision', 'recall', 'retrieve', 'review'] },
  { id: 'tool-local-ai', title: 'Local AI Study Assistant', desc: 'An optional free language model that runs on compatible devices after an explicit download.', route: '/local-ai', file: null, type: 'tool', section: 'Study tools', topic: 'AI', tags: ['AI', 'LLM', 'chat', 'help', 'browser', 'free'] },
];

export const RESOURCE_BY_ID = Object.fromEntries(RESOURCES.map(resource => [resource.id, resource]));
