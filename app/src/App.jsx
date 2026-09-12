import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { AiProvider, LocalAIPage } from './ai/index.js';
import EssayPlanner from './learning/EssayPlanner.jsx';
import Flashcards from './learning/Flashcards.jsx';
import LogicProblems from './learning/LogicProblems.jsx';
import { FLASHCARDS, LOGIC_PROBLEMS } from './learning/content.js';
import QuestionsPage from './resources/QuestionsPage.jsx';
import { RESOURCES } from './resources/catalog.js';
import { loadRatings, saveRatings } from './ratings.mjs';
import './App.css';

const TOPICS = [
  { slug: 'utilitarianism', name: 'Utilitarianism', desc: 'Bentham, Mill, consequences and competing accounts of happiness.', recall: 'How do act and rule utilitarianism differ?', question: 'Can utilitarianism give a satisfactory account of justice?', flash: 'utilitarianism' },
  { slug: 'kantianism', name: 'Kantianism', desc: 'Duty, good will and the Categorical Imperative.', recall: 'Why does Kant distinguish acting from duty from acting in accordance with duty?', question: 'Is acting from duty enough to make an action morally good?', flash: 'kantianism' },
  { slug: 'augustine', name: 'Augustine', desc: 'Human nature, freedom, original sin and theological debate.', recall: 'How are responsibility and grace related in Augustine’s account?', question: 'Does Augustine offer a convincing account of human freedom?' },
  { slug: 'natural-law', name: 'Natural Law', desc: 'Aquinas, practical reason and traditions of natural-law thought.', recall: 'How is natural-law ethics different from a natural-law theory of legal validity?', question: 'Does natural law provide a convincing basis for moral reasoning?' },
  { slug: 'situation-ethics', name: 'Situation Ethics', desc: 'Agape, context and Fletcher’s account of moral decisions.', recall: 'How does situation ethics differ from both legalism and antinomianism?', question: 'Can agape alone guide moral decisions reliably?' },
  { slug: 'gender-theology', name: 'Gender & theology', desc: 'Contrasting draft arguments about gender, religion and Mary Daly.', recall: 'Which claims in these essays are descriptive, and which are normative?', question: 'Can religious traditions respond adequately to feminist criticism?' },
];
const PAGE_TITLES = {
  '/': 'Home', '/intro-philosophy-ethics': 'Introduction to Philosophy and Ethics',
  '/philosophy-fundamentals': 'Introduction to Logic', '/philosophy-fundamentals/logic-problems': 'Logic Practice',
  '/philosophy-basics': 'Essay Planner', '/philosophy-ethics-revision': 'Topic Library',
  '/philosophy-ethics-mind-maps': 'Metaethics Mind Maps', '/philosophy-ethics-questions': 'Practice Questions',
  '/flashcards': 'Flashcards', '/local-ai': 'Free Local AI Tutor',
  ...Object.fromEntries(TOPICS.map(t => ['/philosophy-ethics-revision/' + t.slug, t.name])),
};
const asset = file => import.meta.env.BASE_URL + file.split('/').map(encodeURIComponent).join('/');
const RatingContext = createContext(null);

function RatingProvider({ children }) {
  const [state, setState] = useState(() => loadRatings(RESOURCES));
  useEffect(() => {
    const sync = event => { if (event.key === 'eduresources:ratings:v1') setState(loadRatings(RESOURCES)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const change = (id, rating) => setState(current => {
    const values = { ...current.values, [id]: rating };
    return { ...current, values, available: saveRatings(values) };
  });
  return <RatingContext.Provider value={{ ...state, change }}>{children}</RatingContext.Provider>;
}

function PersonalRating({ resource }) {
  const { values, available, recoveryBlocked, message, change } = useContext(RatingContext);
  const id = useId();
  return <div className="personal-rating">
    <label htmlFor={id}>Your rating <span className="sr-only">for {resource.title}</span></label>
    <select id={id} value={values[resource.id] || 0} onChange={e => change(resource.id, Number(e.target.value))}>
      <option value={0}>Not rated</option>
      {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map(n => <option value={n} key={n}>{n} / 5</option>)}
    </select>
    <small>{recoveryBlocked ? message + ' New ratings last this visit.' : available ? 'Saved on this device · not a public score' : 'Storage unavailable · rating lasts this visit'}</small>
  </div>;
}

function ResourceCard({ resource: r, search = false, onNavigate }) {
  const file = r.file ? asset(r.file) : null;
  return <article className="card resource-card" id={search ? undefined : r.id}>
    <div className="eyebrow">{r.type === 'external' ? 'Podcast · external' : r.type} {search && ` / ${r.topic}`}</div>
    <h3>{r.title}</h3><p>{r.desc}</p>
    {r.reviewNote && <p className="review-note"><strong>Reading note:</strong> {r.reviewNote}</p>}
    {r.type === 'audio' && <audio controls preload="metadata"><source src={file} type="audio/wav" /><a href={file} download>Download audio</a></audio>}
    <div className="actions">
      {r.type === 'pdf' && <><a href={file} target="_blank" rel="noopener noreferrer">Read PDF <span className="sr-only">{r.title} (new tab)</span>↗</a><a href={file} download>Download PDF <span className="sr-only">{r.title}</span>↓</a></>}
      {r.type === 'audio' && <a href={file} download>↓ Download Audio <span className="sr-only">{r.title}</span></a>}
      {r.type === 'external' && <a href={r.url} target="_blank" rel="noopener noreferrer">↗ Open Podcast <span className="sr-only">{r.title} (new tab)</span></a>}
      {r.type === 'tool' && <Link to={r.route} onClick={onNavigate}>Open {r.title} →</Link>}
      {search && r.type !== 'tool' && <Link to={r.route} onClick={onNavigate}>View topic →</Link>}
    </div>
    {r.type !== 'tool' && <PersonalRating resource={r} />}
  </article>;
}
function ResourceGrid({ resources }) { return <div className="card-grid">{resources.map(r => <ResourceCard key={r.id} resource={r} />)}</div>; }

function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const fuse = useMemo(() => new Fuse(RESOURCES, { keys: ['title', 'desc', 'topic', 'tags', 'section'], threshold: 0.33, ignoreLocation: true }), []);
  const results = (query.trim() ? fuse.search(query.trim()).map(r => r.item) : RESOURCES).filter(r => type === 'all' || r.type === type);
  return <section id="site-search" className="search-panel" aria-label="Search all resources" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <div className="container">
      <div className="section-heading"><h2>Find your next step</h2><button type="button" onClick={onClose}>Close search</button></div>
      <div className="search-fields"><label>Search resources and tools<input ref={input} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try Kant, epistemology, or essay planner…" /></label><label>Resource type<select value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option><option value="pdf">PDFs</option><option value="audio">Audio</option><option value="external">Podcasts</option><option value="tool">Study tools</option></select></label></div>
      <p className="muted" role="status">{results.length} {results.length === 1 ? 'result' : 'results'} · Search works without AI.</p>
      {results.length ? <div className="card-grid search-results">{results.map(r => <ResourceCard key={r.id} resource={r} search onNavigate={onClose} />)}</div> : <p>No matches. Try a thinker’s name, a broader topic or “logic”.</p>}
    </div>
  </section>;
}

function Shell() {
  const location = useLocation();
  const main = useRef(null);
  const searchButton = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const title = PAGE_TITLES[location.pathname] || 'Page not found';
  useEffect(() => { document.body.classList.toggle('dark', theme === 'dark'); try { localStorage.setItem('theme', theme); } catch { /* in-memory theme */ } }, [theme]);
  useEffect(() => { try { localStorage.removeItem('eduresources_groq_key'); } catch { /* obsolete remote key no longer needed */ } }, []);
  useEffect(() => {
    const update = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => { document.title = `${title} — EduResources`; setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }, [location.pathname, title]);
  const closeSearch = () => { setSearchOpen(false); searchButton.current?.focus(); };
  return <div className="App">
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Skip to content</a>
    <header className="header">
      <div className="container header-top"><Link className="brand" to="/">EduResources<span>Philosophy · Ethics · Theology</span></Link><div className="header-actions"><button ref={searchButton} type="button" aria-expanded={searchOpen} aria-controls="site-search" onClick={() => setSearchOpen(v => !v)}>Search</button><button type="button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? '☾ Dark' : '☀ Light'}</button></div></div>
      <nav className="container primary-nav" aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/philosophy-ethics-revision">Topic library</NavLink><NavLink to="/flashcards">Flashcards</NavLink><NavLink to="/philosophy-fundamentals/logic-problems">Logic practice</NavLink><NavLink to="/philosophy-basics">Essay planner</NavLink><NavLink to="/philosophy-ethics-questions">Questions</NavLink><NavLink to="/local-ai">Local AI tutor</NavLink></nav>
    </header>
    {searchOpen && <SearchPanel onClose={closeSearch} />}
    <main id="main-content" ref={main} tabIndex={-1} className="container main-content" aria-label={title}>
      {location.pathname !== '/' && <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true"> / </span>{location.pathname.startsWith('/philosophy-ethics-revision/') && <><Link to="/philosophy-ethics-revision">Topic library</Link><span aria-hidden="true"> / </span></>}<span aria-current="page">{title}</span></nav>}
      <Routes>
        <Route path="/" element={<Home />} /><Route path="/intro-philosophy-ethics" element={<Intro />} /><Route path="/philosophy-fundamentals" element={<LogicIntro />} />
        <Route path="/philosophy-fundamentals/logic-problems" element={<LogicProblems />} /><Route path="/philosophy-basics" element={<EssayPlanner />} />
        <Route path="/essay-planner" element={<Navigate to={'/philosophy-basics' + location.search} replace />} /><Route path="/philosophy-ethics-revision" element={<TopicLibrary />} />
        <Route path="/philosophy-ethics-revision/:topic" element={<TopicPage />} /><Route path="/philosophy-ethics-mind-maps" element={<MindMaps />} />
        <Route path="/philosophy-ethics-questions" element={<QuestionsPage />} /><Route path="/flashcards" element={<Flashcards />} />
        <Route path="/local-ai" element={<LocalAIPage resources={RESOURCES} reviewedContent={REVIEWED_EXCERPTS} />} /><Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <footer className="site-footer container"><p>EduResources · Sapere aude.</p><p>Study resources, not official exam-board guidance. Check your course specification and original sources.</p><p>Your drafts, reviews and ratings stay in this browser. Clearing site data removes them; export important work. AI is optional and can make mistakes.</p><a href="https://github.com/Slimsh8dy/eduresources" target="_blank" rel="noopener noreferrer">Source &amp; project history ↗</a></footer>
    {showBackToTop && <button className="back-to-top" aria-label="Back to top" onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }}>↑</button>}
  </div>;
}

function Feature({ label, title, desc, to, cta }) { return <article className="card feature"><span className="eyebrow">{label}</span><h3>{title}</h3><p>{desc}</p><Link to={to}>{cta} →</Link></article>; }
function Home() {
  return <><section className="hero"><p className="eyebrow">A place to think for yourself</p><h1>Sapere aude<span>Build a better argument.</span></h1><p>Free resources for philosophy, ethics and theology. Understand the ideas, test your recall, then make a case of your own.</p><div className="actions"><Link className="btn" to="/philosophy-ethics-revision">Explore the topic library →</Link><Link to="/philosophy-basics">Start an essay plan</Link></div></section>
    <section className="home-section"><div className="section-heading"><div><p className="eyebrow">Start where you are</p><h2>One idea. Four ways to work with it.</h2></div></div><div className="card-grid">
      <Feature label="01 / Understand" title="Read the ideas" desc="Start with knowledge, moral reasoning and the structure of an argument." to="/intro-philosophy-ethics" cta="Explore the foundations" />
      <Feature label="02 / Retrieve" title="Test what you remember" desc="Reveal, reflect and choose what to review next. Your progress stays on this device." to="/flashcards" cta="Review flashcards" />
      <Feature label="03 / Apply" title="Test an argument" desc="Work through logic problems, compare a reasoned solution and revise your answer." to="/philosophy-fundamentals/logic-problems" cta="Practise logic" />
      <Feature label="04 / Evaluate" title="Build your own position" desc="Choose a question and develop a plan with objections, replies and a final judgement." to="/philosophy-ethics-questions" cta="Choose a practice question" />
    </div></section><section className="home-section"><h2>Find your topic</h2><TopicCards /></section>
    <section className="ai-banner"><div><p className="eyebrow">Optional / Runs on your device</p><h2>A thinking partner, not an answer key.</h2><p>A free local AI tutor can ask questions, unpack concepts and help you find resources. No account or API key. Compatible hardware and an initial model download are required.</p></div><Link className="btn" to="/local-ai">Explore local AI →</Link></section></>;
}
function TopicCards() { return <div className="card-grid">{TOPICS.map(t => <Feature key={t.slug} label="Topic" title={t.name} desc={t.desc} to={'/philosophy-ethics-revision/' + t.slug} cta="Read & practise" />)}</div>; }
function TopicLibrary() {
  return <><p className="eyebrow">Philosophy / Ethics / Theology</p><h1>Topic library</h1><p className="lede">Read the source material, retrieve an idea and turn it into an argument. Notes and draft essays are labelled so you can evaluate their claims critically.</p><TopicCards /><h2 className="spaced-heading">Foundations &amp; cross-topic tools</h2><div className="card-grid"><Feature label="Foundation" title="Philosophy and ethics" desc="Knowledge, moral knowledge and ethical justification." to="/intro-philosophy-ethics" cta="Open introductions" /><Feature label="Foundation" title="Introduction to Logic" desc="Arguments, validity, soundness and admissions preparation." to="/philosophy-fundamentals" cta="Open logic resources" /><Feature label="Visual revision" title="Metaethics mind maps" desc="Compare cognitivism and non-cognitivism before evaluating a position." to="/philosophy-ethics-mind-maps" cta="Open mind maps" /></div></>;
}
function LearningPath({ topic, recall, question, flash }) {
  return <section className="learning-path" aria-label={`Study path for ${topic}`}><h2>Put the reading to work</h2><ol><li><strong>Read or listen</strong><p>Choose one resource below. Note its central claim and one reason offered for it.</p></li><li><strong>Retrieve</strong><p>{recall}</p>{flash ? <Link to={'/flashcards?topic=' + encodeURIComponent(flash)}>Review topic flashcards →</Link> : <p className="muted">Answer from memory, then check your notes.</p>}</li><li><strong>Apply</strong><p>Construct a counterexample or an objection. What would a defender say?</p><Link to="/philosophy-fundamentals/logic-problems">Check your reasoning →</Link></li><li><strong>Plan &amp; evaluate</strong><p>{question}</p><Link to={'/philosophy-basics?question=' + encodeURIComponent(question)}>Plan this question →</Link></li></ol></section>;
}
function TopicPage() {
  const { topic } = useParams(); const t = TOPICS.find(item => item.slug === topic); if (!t) return <NotFound />;
  return <><p className="eyebrow">Topic study</p><h1>{t.name}</h1><p className="lede">{t.desc}</p><LearningPath topic={t.name} recall={t.recall} question={t.question} flash={t.flash} /><h2 className="spaced-heading">Resources</h2><ResourceGrid resources={RESOURCES.filter(r => r.topic === t.name && r.type !== 'tool')} /></>;
}
function Intro() { return <><h1>Introduction to Philosophy and Ethics</h1><p className="lede">Start with knowledge, justification and what it could mean to know something morally.</p><LearningPath topic="Introduction" recall="What is the difference between holding a belief and having a justification for it?" question="Can moral beliefs count as knowledge?" /><h2 className="spaced-heading">Foundational reading</h2><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Introduction')} /></>; }
function LogicIntro() { return <><h1>Introduction to Logic</h1><p className="lede">Learn to separate an argument’s form from the truth of its premises.</p><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Logic' && r.type === 'pdf')} /><section className="ai-banner"><div><h2>Now test the inference</h2><p>Try 12 reviewed problems. Write your reasoning, reveal the solution and revise your judgement.</p></div><Link className="btn" to="/philosophy-fundamentals/logic-problems">Start logic practice →</Link></section></>; }
function MindMaps() { return <><h1>Metaethics mind maps</h1><p className="lede">Map the positions, then ask which account of moral language and truth is most convincing.</p><LearningPath topic="Metaethics" recall="Does a non-cognitivist treat a moral judgement as a truth-apt belief?" question="Does non-cognitivism explain moral language adequately?" /><h2 className="spaced-heading">Visual summaries</h2><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Metaethics')} /></>; }
function NotFound() { return <section><h1>That page isn’t in the library.</h1><p>The link may be outdated. Your saved work hasn’t been changed.</p><Link className="btn" to="/">Return home →</Link></section>; }
const REVIEWED_EXCERPTS = [
  ...FLASHCARDS.map(c => ({ resourceId: 'tool-flashcards', title: `${c.concept} — ${c.thinker}`, text: c.definition })),
  ...LOGIC_PROBLEMS.map(p => ({ resourceId: 'tool-logic-practice', title: p.title, text: typeof p.solution === 'string' ? p.solution : JSON.stringify(p.solution) })),
];
export default function App() { return <HashRouter><AiProvider><RatingProvider><Shell /></RatingProvider></AiProvider></HashRouter>; }
