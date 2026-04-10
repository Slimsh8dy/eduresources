import React from "react";
import { HashRouter as Router, Route, Routes, Link } from "react-router-dom";
import "./App.css";
import Fuse from 'fuse.js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Rating from 'react-rating';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Asset helper — works on both CRA (PUBLIC_URL) and Vite (BASE_URL).
 */
const BASE =
  (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) ||
  "/";
const asset = (p) => {
  const base = BASE.endsWith("/") ? BASE : BASE + "/";
  const path = String(p).replace(/^\//, "");
  return (base + path).replace(/\/{2,}/g, "/");
};

/* ---- Shared Rating component ---- */
const StarRating = ({ ratingKey }) => {
  const [rating, setRating] = React.useState(
    parseFloat(localStorage.getItem(ratingKey)) || 0
  );
  const handleChange = (value) => {
    setRating(value);
    localStorage.setItem(ratingKey, value);
  };
  return (
    <Rating
      initialRating={rating}
      onChange={handleChange}
      fractions={2}
      emptySymbol={<span style={{ color: 'var(--border-color)', fontSize: '1.1rem' }}>☆</span>}
      fullSymbol={<span style={{ color: '#c8962a', fontSize: '1.1rem' }}>★</span>}
    />
  );
};

/* ---- Cards ---- */
const DownloadCard = ({ title, file, desc }) => {
  const href = encodeURI(asset(file));
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="card">
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a href={href} download>↓ Download PDF</a>
        <button onClick={() => setModalOpen(true)}>Preview</button>
      </div>
      <StarRating ratingKey={`rating_${title}_${file}`} />
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalOpen(false)}>✕ Close</button>
            <Document file={href}>
              <Page pageNumber={1} width={Math.min(window.innerWidth * 0.8, 600)} />
            </Document>
          </div>
        </div>
      )}
    </div>
  );
};

const AudioCard = ({ title, file, desc }) => {
  const src = encodeURI(asset(file));
  return (
    <div className="card">
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      <audio controls preload="metadata">
        <source src={src} type="audio/wav" />
        <a href={src} download>Download audio</a>
      </audio>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 8px" }}>
        <a href={src} download>↓ Download Audio</a>
      </div>
      <StarRating ratingKey={`rating_${title}_${file}`} />
    </div>
  );
};

const ExternalLinkCard = ({ title, url, desc, cta = "Open Link" }) => (
  <div className="card">
    <h3>{title}</h3>
    {desc && <p>{desc}</p>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <a href={url} target="_blank" rel="noopener noreferrer">↗ {cta}</a>
    </div>
    <StarRating ratingKey={`rating_${title}_${url}`} />
  </div>
);

const FolderGrid = ({ folders, basePath }) => (
  <div className="card-grid">
    {folders.map((f) => (
      <div className="card" key={f.key}>
        <h3>{f.name}</h3>
        <p>{f.desc || `Open the ${f.name} folder.`}</p>
        <Link to={`${basePath}/${f.key}`}>Open Folder →</Link>
      </div>
    ))}
  </div>
);

/* ---- Global search data ---- */
const ALL_RESOURCES = [
  { title: "Utilitarianism (Revision Notes)", file: "resources/Utilitarianism.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Utilitarianism — For & Against", file: "resources/Utilitarianism-For-Against.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Bentham — Intro (Audio)", file: "resources/Bentham-intro.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Bentham — Strengths & Weaknesses (Audio)", file: "resources/Bentham-strengths-weaknesses.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Mill — Summary (Audio)", file: "resources/Mill-summary.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Defender–Challenger (Audio)", file: "resources/Defender-Challenger.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "In Our Time — Utilitarianism (Podcast)", url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660", type: "link", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Kant — Main Concepts (Revision Notes)", file: "resources/Kant-Main-Concepts.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "Kant — SEP 1 (Audio)", file: "resources/Kant-SEP1.wav", type: "audio", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "Kant — SEP 2 (Audio)", file: "resources/Kant-SEP2.wav", type: "audio", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "In Our Time — Kant (Podcast)", url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000392533436", type: "link", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "Augustine — Notes", file: "resources/Augustine-Notes.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "Reflections — Paul", file: "resources/Reflections-Paul.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "Kierkegaard — Original Sin", file: "resources/Kierkegaard-Original-Sin.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "In Our Time — Augustine of Hippo (Podcast)", url: "https://podcasts.apple.com/gb/podcast/in-our-time-religion/id463701224?i=1000406479219", type: "link", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "Metaethics — Cognitivism (Mind Map)", file: "resources/Metaethics-Cognitivism.pdf", type: "pdf", section: "Mind Maps" },
  { title: "Metaethics — Non-Cognitivism (Mind Map)", file: "resources/Metaethics-Non-Cognitivism.pdf", type: "pdf", section: "Mind Maps" },
  { title: "Exam Questions (Practice Pack)", file: "resources/Exam-Questions.pdf", type: "pdf", section: "Practice Questions" },
];

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/* ---- Search panel ---- */
function HeaderSearchPanel({ open, onClose }) {
  const [q, setQ] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const query = normalize(q);
  const panelRef = React.useRef(null);

  const fuse = React.useMemo(() => new Fuse(ALL_RESOURCES, {
    keys: ['title', 'section'],
    threshold: 0.35,
  }), []);

  const results = React.useMemo(() => {
    if (!query) return [];
    return fuse.search(query).map(r => r.item);
  }, [query, fuse]);

  const suggestions = React.useMemo(() => {
    if (!query) return [];
    return fuse.search(query).slice(0, 5).map(r => r.item.title);
  }, [query, fuse]);

  React.useEffect(() => {
    if (!open) setQ("");
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        transition: "max-height 220ms ease",
        maxHeight: open ? "75vh" : 0,
        overflowY: open ? "auto" : "hidden",
        borderBottom: open ? "1px solid var(--border-color)" : "1px solid transparent",
        backgroundColor: "var(--bg-color)",
        boxShadow: open ? "var(--shadow-md)" : "none",
      }}
      aria-hidden={!open}
    >
      <div className="container" style={{ paddingTop: 14, paddingBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              autoFocus={open}
              aria-label="Search resources"
              placeholder="Search — try 'utilitarianism', 'Kant', 'mind map'…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              style={{ width: '100%', padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 15, backgroundColor: "var(--bg-input)", color: "var(--text-color)", fontFamily: "inherit", outline: "none" }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, zIndex: 20, boxShadow: "var(--shadow-md)", marginTop: 4 }}>
                {suggestions.map((sug, i) => (
                  <div
                    key={i}
                    onMouseDown={() => { setQ(sug); setShowSuggestions(false); }}
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.875rem', color: "var(--text-color)", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border-color)" : "none" }}
                    onMouseEnter={e => e.target.style.backgroundColor = "var(--border-color)"}
                    onMouseLeave={e => e.target.style.backgroundColor = ""}
                  >
                    {sug}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{ border: "1px solid var(--border-color)", background: "transparent", borderRadius: 8, padding: "9px 14px", cursor: "pointer", color: "var(--text-color)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit" }}
          >
            Close
          </button>
        </div>
        {query ? (
          <>
            <p style={{ margin: "0 0 14px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              {results.length} result{results.length === 1 ? "" : "s"} for "<strong style={{ color: "var(--text-color)" }}>{q}</strong>"
            </p>
            <div className="card-grid">
              {results.map((r) => {
                if (r.type === "audio") return <AudioCard key={`${r.type}:${r.file}`} title={r.title} file={r.file} desc={r.section} />;
                if (r.type === "link") return <ExternalLinkCard key={`${r.type}:${r.url}`} title={r.title} url={r.url} desc={r.section} cta="Open Podcast" />;
                return <DownloadCard key={`${r.type}:${r.file}`} title={r.title} file={r.file} desc={r.section} />;
              })}
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
            Try: <em>utilitarianism</em>, <em>Kant</em>, <em>Augustine</em>, <em>mind map</em>
          </p>
        )}
      </div>
    </div>
  );
}

/* ---- App root ---- */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/intro-philosophy-ethics" element={<IntroPhilosophyEthics />} />
        <Route path="/philosophy-fundamentals" element={<PhilosophyFundamentals />} />
        <Route path="/philosophy-basics" element={<PhilosophyBasics />} />
        <Route path="/philosophy-ethics-revision" element={<PhilosophyEthicsRevision />} />
        <Route path="/philosophy-ethics-revision/utilitarianism" element={<RevisionUtilitarianism />} />
        <Route path="/philosophy-ethics-revision/kantianism" element={<RevisionKantianism />} />
        <Route path="/philosophy-ethics-revision/augustine" element={<RevisionAugustine />} />
        <Route path="/philosophy-ethics-mind-maps" element={<PhilosophyEthicsMindMaps />} />
        <Route path="/philosophy-ethics-questions" element={<PhilosophyEthicsQuestions />} />
      </Routes>
    </Router>
  );
}

/* ---- Main layout ---- */
function MainLayout() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'light');
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>EduResources</h1>
          <nav>
            <button
              onClick={(e) => { e.preventDefault(); setSearchOpen(v => !v); }}
              aria-expanded={searchOpen}
              style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-color)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 500, padding: "0.4rem 0.75rem", borderRadius: 8 }}
            >
              Search
            </button>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              title="Toggle theme"
            >
              {theme === 'light' ? '☾ Dark' : '☀ Light'}
            </button>
          </nav>
        </div>
        <div id="search-panel">
          <HeaderSearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      </header>

      <section id="home" className="hero">
        <div className="container">
          <h2>Sapere aude</h2>
          <p>Free revision materials for Philosophy, Ethics &amp; Theology.</p>
        </div>
      </section>

      <section id="resources" className="section">
        <div className="container">
          <h2>Resources</h2>
          <p>Browse tutorials and revision tools.</p>

          <h3>Tutorials</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Introduction to Philosophy and Ethics</h3>
              <p>Basic concepts and examples explained simply.</p>
              <Link to="/intro-philosophy-ethics">View Resources →</Link>
            </div>
            <div className="card">
              <h3>Philosophy Fundamentals</h3>
              <p>Key principles for beginners.</p>
              <Link to="/philosophy-fundamentals">View Resources →</Link>
            </div>
            <div className="card">
              <h3>Philosophy Basics</h3>
              <p>Start your journey with easy steps.</p>
              <Link to="/philosophy-basics">View Resources →</Link>
            </div>
          </div>

          <h3>Philosophy / Ethics / Theology</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Revision Materials</h3>
              <p>Cross-topic notes, PDFs, and audio for Utilitarianism, Kant &amp; Augustine.</p>
              <Link to="/philosophy-ethics-revision">Open Folder →</Link>
            </div>
            <div className="card">
              <h3>Mind Maps</h3>
              <p>Visual overviews of Metaethics — Cognitivism and Non-Cognitivism.</p>
              <Link to="/philosophy-ethics-mind-maps">Open Folder →</Link>
            </div>
            <div className="card">
              <h3>Practice Questions</h3>
              <p>Past-style exam questions to test your knowledge.</p>
              <Link to="/philosophy-ethics-questions">View Resources →</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <h2>About</h2>
          <p>
            EduResources provides free, accessible learning materials in a clean, minimal design.
            We focus on quality over quantity to help learners succeed.
          </p>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container">
          <h2>Contact</h2>
          <form onSubmit={e => e.preventDefault()}>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" placeholder="Your name" />
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="your@email.com" />
            <label htmlFor="message">Message</label>
            <textarea id="message" rows="4" placeholder="Your message" />
            <button type="submit">Send message</button>
          </form>
        </div>
      </section>

      <footer>
        <p>&copy; 2025 EduResources. All rights reserved.</p>
      </footer>

      {showBackToTop && (
        <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          ↑
        </button>
      )}
    </div>
  );
}

/* ---- Placeholder pages ---- */
function PlaceholderPage({ title, crumb }) {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav><Link to="/">Home</Link> › {crumb}</nav>
          <h2>{title}</h2>
          <p style={{ color: "var(--text-muted)" }}>No resources added yet.</p>
          <Link to="/" className="btn">← Back to Home</Link>
        </div>
      </section>
    </div>
  );
}

function IntroPhilosophyEthics() {
  return <PlaceholderPage title="Introduction to Philosophy and Ethics" crumb="Intro to Philosophy & Ethics" />;
}
function PhilosophyFundamentals() {
  return <PlaceholderPage title="Philosophy Fundamentals" crumb="Philosophy Fundamentals" />;
}
function PhilosophyBasics() {
  return <PlaceholderPage title="Philosophy Basics" crumb="Philosophy Basics" />;
}

/* ---- Revision folder pages ---- */
function PhilosophyEthicsRevision() {
  const folders = [
    { key: "utilitarianism", name: "Utilitarianism", desc: "Notes, arguments, audio summaries, and a podcast episode." },
    { key: "kantianism", name: "Kantianism", desc: "Main concepts and SEP-aligned audio summaries." },
    { key: "augustine", name: "Augustine", desc: "Notes on Augustine, Paul, and original sin (+ podcast)." },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav><Link to="/">Home</Link> › Philosophy/Ethics/Theology</nav>
          <h2>Philosophy / Ethics / Theology</h2>
          <p>Select a topic to view and download resources.</p>
          <FolderGrid folders={folders} basePath="/philosophy-ethics-revision" />
        </div>
      </section>
    </div>
  );
}

function RevisionUtilitarianism() {
  const pdfs = [
    { title: "Utilitarianism — Revision Notes", file: "resources/Utilitarianism.pdf", desc: "Concise notes on core utilitarian ideas and key distinctions." },
    { title: "Utilitarianism — For & Against", file: "resources/Utilitarianism-For-Against.pdf", desc: "Arguments in favour of and against utilitarianism." },
  ];
  const audio = [
    { title: "Bentham — Intro", file: "resources/Bentham-intro.wav", desc: "Short introduction to Bentham's version of utilitarianism." },
    { title: "Bentham — Strengths & Weaknesses", file: "resources/Bentham-strengths-weaknesses.wav", desc: "Key advantages and criticisms of Bentham's approach." },
    { title: "Mill — Summary", file: "resources/Mill-summary.wav", desc: "Brief overview of J. S. Mill's refinements to utilitarianism." },
    { title: "Defender–Challenger", file: "resources/Defender-Challenger.wav", desc: "A defender of utilitarianism versus a challenger." },
  ];
  const links = [
    { title: "In Our Time — Utilitarianism", url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660", desc: "BBC Radio 4 podcast episode.", cta: "Open Podcast" },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav>
            <Link to="/">Home</Link> › <Link to="/philosophy-ethics-revision">Philosophy/Ethics/Theology</Link> › Utilitarianism
          </nav>
          <h2>Utilitarianism</h2>
          <p>Audio, PDFs, and a linked podcast episode.</p>
          <div className="card-grid">
            {pdfs.map(r => <DownloadCard key={r.file} {...r} />)}
            {audio.map(r => <AudioCard key={r.file} {...r} />)}
            {links.map(r => <ExternalLinkCard key={r.url} {...r} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function RevisionKantianism() {
  const pdfs = [
    { title: "Kant — Main Concepts", file: "resources/Kant-Main-Concepts.pdf", desc: "Good will, duty, maxims, and the Categorical Imperative." },
  ];
  const audio = [
    { title: "Kant — SEP Overview (Part 1)", file: "resources/Kant-SEP1.wav", desc: "A short overview aligned to SEP themes (part 1)." },
    { title: "Kant — SEP Overview (Part 2)", file: "resources/Kant-SEP2.wav", desc: "Continuation of the SEP-aligned overview (part 2)." },
  ];
  const links = [
    { title: "In Our Time — Kant", url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000392533436", desc: "BBC Radio 4 podcast episode.", cta: "Open Podcast" },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav>
            <Link to="/">Home</Link> › <Link to="/philosophy-ethics-revision">Philosophy/Ethics/Theology</Link> › Kantianism
          </nav>
          <h2>Kantianism</h2>
          <p>Audio, a PDF, and a linked podcast episode.</p>
          <div className="card-grid">
            {pdfs.map(r => <DownloadCard key={r.file} {...r} />)}
            {audio.map(r => <AudioCard key={r.file} {...r} />)}
            {links.map(r => <ExternalLinkCard key={r.url} {...r} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function RevisionAugustine() {
  const pdfs = [
    { title: "Augustine — Notes", file: "resources/Augustine-Notes.pdf", desc: "Selected notes on Augustine's theology." },
    { title: "Reflections — Paul", file: "resources/Reflections-Paul.pdf", desc: "Pauline reflections related to Augustine's themes." },
    { title: "Kierkegaard — Original Sin", file: "resources/Kierkegaard-Original-Sin.pdf", desc: "Kierkegaard on sin and responsibility." },
  ];
  const links = [
    { title: "In Our Time — Augustine of Hippo", url: "https://podcasts.apple.com/gb/podcast/in-our-time-religion/id463701224?i=1000406479219", desc: "BBC Radio 4 podcast episode.", cta: "Open Podcast" },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav>
            <Link to="/">Home</Link> › <Link to="/philosophy-ethics-revision">Philosophy/Ethics/Theology</Link> › Augustine
          </nav>
          <h2>Augustine</h2>
          <p>PDFs and a linked podcast episode.</p>
          <div className="card-grid">
            {pdfs.map(r => <DownloadCard key={r.file} {...r} />)}
            {links.map(r => <ExternalLinkCard key={r.url} {...r} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function PhilosophyEthicsMindMaps() {
  const resources = [
    { title: "Metaethics — Cognitivism", file: "resources/Metaethics-Cognitivism.pdf", desc: "Overview of cognitivist positions in metaethics." },
    { title: "Metaethics — Non-Cognitivism", file: "resources/Metaethics-Non-Cognitivism.pdf", desc: "Overview of non-cognitivist positions in metaethics." },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav><Link to="/">Home</Link> › Mind Maps</nav>
          <h2>Mind Maps</h2>
          <p>Visual aids for metaethics.</p>
          <div className="card-grid">
            {resources.map(r => <DownloadCard key={r.file} {...r} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function PhilosophyEthicsQuestions() {
  const resources = [
    { title: "Exam Questions — Practice Pack", file: "resources/Exam-Questions.pdf", desc: "Past-style questions and prompts for practice." },
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav><Link to="/">Home</Link> › Practice Questions</nav>
          <h2>Practice Questions</h2>
          <p>Test your knowledge with past-style exam questions.</p>
          <div className="card-grid">
            {resources.map(r => <DownloadCard key={r.file} {...r} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
