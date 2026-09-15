import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { AiProvider, AiTutorPage } from './ai/index.js';
import EssayPlanner from './learning/EssayPlanner.jsx';
import Flashcards from './learning/Flashcards.jsx';
import LogicProblems from './learning/LogicProblems.jsx';
import QuestionsPage from './resources/QuestionsPage.jsx';
import { RESOURCES } from './resources/catalog.js';
import { loadRatings, saveRatings } from './ratings.mjs';
import './App.css';

const TOPICS = [
  { slug: 'utilitarianism', name: 'Utilitarianism' },
  { slug: 'kantianism', name: 'Kantianism' },
  { slug: 'augustine', name: 'Augustine' },
  { slug: 'natural-law', name: 'Natural Law' },
  { slug: 'situation-ethics', name: 'Situation Ethics' },
  { slug: 'conscience', name: 'Conscience' },
  { slug: 'gender-theology', name: 'Gender & theology' },
];
const PAGE_TITLES = {
  '/': 'Home', '/intro-philosophy-ethics': 'Introduction to Philosophy and Ethics',
  '/philosophy-fundamentals': 'Introduction to Logic', '/philosophy-fundamentals/logic-problems': 'Logic Practice',
  '/philosophy-basics': 'Essay Planner', '/philosophy-ethics-revision': 'Topic Library',
  '/philosophy-ethics-mind-maps': 'Metaethics Mind Maps', '/philosophy-ethics-questions': 'Questions',
  '/flashcards': 'Flashcards', '/ai-tutor': 'AI tutor',
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
  const { values, change } = useContext(RatingContext);
  const id = useId();
  return <div className="personal-rating">
    <label htmlFor={id}>Your rating <span className="sr-only">for {resource.title}</span></label>
    <select id={id} value={values[resource.id] || 0} onChange={e => change(resource.id, Number(e.target.value))}>
      <option value={0}>Not rated</option>
      {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map(n => <option value={n} key={n}>{n} / 5</option>)}
    </select>
  </div>;
}
function RatingNote() {
  const { available, recoveryBlocked, message } = useContext(RatingContext);
  return <p className="rating-note">{recoveryBlocked ? `${message} New ratings last this visit.` : available ? 'Ratings are saved on this device only; they are not a public score.' : 'Storage is unavailable, so ratings last this visit only.'}</p>;
}

function ResourceCard({ resource: r, search = false, compact = false, onNavigate }) {
  const file = r.file ? asset(r.file) : null;
  const Heading = compact ? 'h2' : 'h3';
  const description = <><p>{r.desc}</p>{r.reviewNote && <p className="review-note"><strong>Reading note:</strong> {r.reviewNote}</p>}</>;
  return <article className={`card resource-card${compact ? ' resource-card--compact' : ''}`} id={search ? undefined : r.id}>
    <div className="resource-heading"><div className="eyebrow">{r.type === 'external' ? 'Podcast · external' : r.type} {search && ` / ${r.topic}`}</div><Heading>{r.title}</Heading></div>
    {!compact && description}
    {r.type === 'audio' && <audio controls preload="metadata"><source src={file} type="audio/wav" /><a href={file} download>Download audio</a></audio>}
    <div className="actions">
      {r.type === 'pdf' && <><a href={file} target="_blank" rel="noopener noreferrer">Read PDF <span className="sr-only">{r.title} (new tab)</span>↗</a><a href={file} download>Download PDF <span className="sr-only">{r.title}</span>↓</a></>}
      {r.type === 'audio' && <a href={file} download>↓ Download Audio <span className="sr-only">{r.title}</span></a>}
      {r.type === 'external' && <a href={r.url} target="_blank" rel="noopener noreferrer">↗ Open Podcast <span className="sr-only">{r.title} (new tab)</span></a>}
      {r.type === 'tool' && <Link to={r.route} onClick={onNavigate}>Open {r.title} →</Link>}
      {search && r.type !== 'tool' && <Link to={r.route} onClick={onNavigate}>View topic →</Link>}
    </div>
    {compact ? <details className="resource-details"><summary>Details<span className="sr-only"> about {r.title}</span></summary>{description}{r.type !== 'tool' && <><PersonalRating resource={r} /><RatingNote /></>}</details> : r.type !== 'tool' && <PersonalRating resource={r} />}
  </article>;
}
function ResourceGrid({ resources }) { return <div className="resource-list">{resources.map(r => <ResourceCard key={r.id} resource={r} compact />)}</div>; }

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
      <p className="muted" role="status">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
      {results.length ? <><div className="card-grid search-results">{results.map(r => <ResourceCard key={r.id} resource={r} search onNavigate={onClose} />)}</div><RatingNote /></> : <p>No matches. Try a thinker’s name, a broader topic or “logic”.</p>}
    </div>
  </section>;
}

function Shell() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isResourcePage = location.pathname.startsWith('/philosophy-ethics-revision') || ['/intro-philosophy-ethics', '/philosophy-fundamentals', '/philosophy-ethics-mind-maps', '/philosophy-ethics-questions'].includes(location.pathname);
  const main = useRef(null);
  const searchButton = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const title = PAGE_TITLES[location.pathname] || 'Page not found';
  useEffect(() => { document.body.classList.toggle('dark', theme === 'dark'); try { localStorage.setItem('theme', theme); } catch { /* in-memory theme */ } }, [theme]);
  useEffect(() => {
    const update = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => { document.title = `${title} — EduResources`; setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }, [location.pathname, title]);
  const closeSearch = () => { setSearchOpen(false); searchButton.current?.focus(); };
  return <div className="App">
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Skip to content</a>
    <header className={`header${isHome ? ' header--home' : ''}`}>
      <div className="container header-top"><Link className="brand" to="/">EduResources</Link><div className="header-actions"><button ref={searchButton} type="button" aria-expanded={searchOpen} aria-controls="site-search" onClick={() => setSearchOpen(v => !v)}>Search</button><button type="button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? '☾ Dark' : '☀ Light'}</button></div></div>
      {!isHome && <nav className="container primary-nav" aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/philosophy-ethics-revision">Topic library</NavLink><NavLink to="/flashcards">Flashcards</NavLink><NavLink to="/philosophy-fundamentals/logic-problems">Logic practice</NavLink><NavLink to="/philosophy-basics">Essay planner</NavLink><NavLink to="/philosophy-ethics-questions">Questions</NavLink><NavLink to="/ai-tutor">AI tutor</NavLink></nav>}
    </header>
    {searchOpen && <SearchPanel onClose={closeSearch} />}
    <main id="main-content" ref={main} tabIndex={-1} className={`container main-content${isHome ? ' main-content--home' : ''}`} aria-label={title}>
      {location.pathname !== '/' && <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true"> / </span>{location.pathname.startsWith('/philosophy-ethics-revision/') && <><Link to="/philosophy-ethics-revision">Topic library</Link><span aria-hidden="true"> / </span></>}<span aria-current="page">{title}</span></nav>}
      <Routes>
        <Route path="/" element={<Home />} /><Route path="/intro-philosophy-ethics" element={<Intro />} /><Route path="/philosophy-fundamentals" element={<LogicIntro />} />
        <Route path="/philosophy-fundamentals/logic-problems" element={<LogicProblems />} /><Route path="/philosophy-basics" element={<EssayPlanner />} />
        <Route path="/essay-planner" element={<Navigate to={'/philosophy-basics' + location.search} replace />} /><Route path="/philosophy-ethics-revision" element={<TopicLibrary />} />
        <Route path="/philosophy-ethics-revision/:topic" element={<TopicPage />} /><Route path="/philosophy-ethics-mind-maps" element={<MindMaps />} />
        <Route path="/philosophy-ethics-questions" element={<QuestionsPage />} /><Route path="/flashcards" element={<Flashcards />} />
        <Route path="/ai-tutor" element={<AiTutorPage />} /><Route path="/local-ai" element={<Navigate to="/ai-tutor" replace />} /><Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <SiteFooter compact={isHome || isResourcePage} />
    {showBackToTop && <button className="back-to-top" aria-label="Back to top" onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }}>↑</button>}
  </div>;
}

function SiteFooter({ compact }) {
  const notes = <><p>Study resources, not official exam-board guidance. Check your course specification and original sources.</p><p>Your drafts, reviews and ratings stay in this browser; clearing site data removes them, so export important work. The AI tutor is optional and can make mistakes.</p></>;
  return <footer className={`site-footer container${compact ? ' site-footer--compact' : ''}`}>
    {compact ? <details className="home-about"><summary>About</summary><div>{notes}</div></details> : <><p>EduResources · Sapere aude.</p>{notes}</>}
    <a href="https://github.com/Slimsh8dy/eduresources" target="_blank" rel="noopener noreferrer">{compact ? 'Source ↗' : 'Source & project history ↗'}</a>
  </footer>;
}

const HOME_TOOLS = [
  { icon: 'book', label: 'Topic library', to: '/philosophy-ethics-revision' },
  { icon: 'cards', label: 'Flashcards', to: '/flashcards' },
  { icon: 'logic', label: 'Logic practice', to: '/philosophy-fundamentals/logic-problems' },
  { icon: 'essay', label: 'Essay planner', to: '/philosophy-basics' },
  { icon: 'question', label: 'Questions', to: '/philosophy-ethics-questions' },
  { icon: 'conversation', label: 'AI tutor', to: '/ai-tutor' },
];
function HomeIcon({ type }) {
  const shapes = {
    folder: <path d="M3 8h10l3 4h13v15H3V8ZM3 8V5h9l3 3h11v4" />,
    book: <><path d="M16 8C12 5 7 5 3 6v20c4-1 9-1 13 2 4-3 9-3 13-2V6c-4-1-9-1-13 2Z" /><path d="M16 8v20M7 11c2-.2 4 .1 5 1M20 12c1-1 3-1.2 5-1" /></>,
    cards: <><path d="M10 4h17v20M6 8h17v20" /><rect x="2" y="12" width="17" height="18" rx="2" /><path d="M7 18h7M7 23h4" /></>,
    logic: <><circle cx="16" cy="6" r="3" /><circle cx="6" cy="26" r="3" /><circle cx="26" cy="26" r="3" /><path d="M16 9v7M6 23v-7h20v7" /></>,
    essay: <><path d="M15 5H5v24h22V18M9 11h5M9 16h3M9 23h9" /><path d="m15 18 1-5L26 3l4 4-10 10-5 1ZM23 6l4 4" /></>,
    question: <><circle cx="16" cy="16" r="13" /><path d="M12 11a4 4 0 1 1 6 3.5c-2 1-2 2-2 3.5M16 23h.01" /></>,
    conversation: <><path d="M24 15V4H3v17l5-4h8" /><path d="M12 12h17v16l-5-4H12V12Z" /><path d="M16 17h9M16 20h5" /></>,
  };
  return <svg className="home-tool-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[type]}</svg>;
}
function Home() {
  return <div className="home">
    <h1 className="sr-only">Study tools and topics</h1>
    <nav className="home-tools" aria-label="Study tools">
      {HOME_TOOLS.map((tool, index) => <Link className={`home-tool${index === 0 ? ' home-tool--primary' : ''}`} to={tool.to} key={tool.to}>
        <HomeIcon type={tool.icon} />
        <span className="home-tool-label">{tool.label}<span className="home-arrow" aria-hidden="true">↗</span></span>
      </Link>)}
    </nav>
    <nav className="home-topics" aria-label="Topics and foundations">
      <Link to="/intro-philosophy-ethics">Foundations<span aria-hidden="true">→</span></Link>
      {TOPICS.map(topic => <Link key={topic.slug} to={'/philosophy-ethics-revision/' + topic.slug}>{topic.name}<span aria-hidden="true">→</span></Link>)}
    </nav>
  </div>;
}
function FolderLink({ to, title }) { return <Link className="folder-link" to={to}><HomeIcon type="folder" /><span>{title}</span><span className="folder-arrow" aria-hidden="true">→</span></Link>; }
function TopicLibrary() {
  return <><h1>Topic library</h1><nav className="folder-grid" aria-label="Topic folders">{TOPICS.map(topic => <FolderLink key={topic.slug} title={topic.name} to={'/philosophy-ethics-revision/' + topic.slug} />)}</nav><h2 className="spaced-heading">Foundations</h2><nav className="folder-grid" aria-label="Foundation folders"><FolderLink title="Philosophy and ethics" to="/intro-philosophy-ethics" /><FolderLink title="Introduction to Logic" to="/philosophy-fundamentals" /><FolderLink title="Metaethics mind maps" to="/philosophy-ethics-mind-maps" /></nav></>;
}
function TopicPage() {
  const { topic } = useParams(); const t = TOPICS.find(item => item.slug === topic); if (!t) return <NotFound />;
  return <><h1>{t.name}</h1><ResourceGrid resources={RESOURCES.filter(r => r.topic === t.name && r.type !== 'tool')} /></>;
}
function Intro() { return <><h1>Introduction to Philosophy and Ethics</h1><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Introduction')} /></>; }
function LogicIntro() { return <><h1>Introduction to Logic</h1><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Logic' && r.type === 'pdf')} /></>; }
function MindMaps() { return <><h1>Metaethics mind maps</h1><ResourceGrid resources={RESOURCES.filter(r => r.topic === 'Metaethics')} /></>; }
function NotFound() { return <section><h1>That page isn’t in the library.</h1><p>The link may be outdated. Your saved work hasn’t been changed.</p><Link className="btn" to="/">Return home →</Link></section>; }
export default function App() { return <HashRouter><AiProvider><RatingProvider><Shell /></RatingProvider></AiProvider></HashRouter>; }
