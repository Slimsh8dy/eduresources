import React from "react";
import { HashRouter as Router, Route, Routes, Link } from "react-router-dom";
import "./App.css";

/**
 * Asset helper:
 * - Works on Vite (import.meta.env.BASE_URL) and CRA (PUBLIC_URL).
 * - Builds a base-correct URL for GitHub Pages repos.
 */
const BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL) ||
  (typeof window !== "undefined" ? window.location.pathname : "/");

const asset = (p) => {
  const base = BASE.endsWith("/") ? BASE : BASE + "/";
  const path = String(p).replace(/^\//, "");
  return (base + path).replace(/\/{2,}/g, "/");
};

// Contact API base: prod can override with REACT_APP_CONTACT_API
const CONTACT_API = process.env.REACT_APP_CONTACT_API || "/api/contact";

/** Cards */
const DownloadCard = ({ title, file, desc }) => {
  const href = encodeURI(asset(file));
  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {desc ? <p style={{ marginBottom: 12 }}>{desc}</p> : null}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href={href} download>Download PDF</a>
      </div>
    </div>
  );
};

const AudioCard = ({ title, file, desc }) => {
  const src = encodeURI(asset(file));
  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {desc ? <p style={{ marginBottom: 12 }}>{desc}</p> : null}
      <audio controls preload="metadata" style={{ width: "100%", display: "block", marginBottom: 12 }}>
        <source src={src} type="audio/wav" />
        Your browser does not support the audio element. You can{" "}
        <a href={src} download>download the audio here</a>.
      </audio>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href={src} download>Download Audio</a>
      </div>
    </div>
  );
};

const ExternalLinkCard = ({ title, url, desc, cta = "Open Link" }) => (
  <div className="card">
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    {desc ? <p style={{ marginBottom: 12 }}>{desc}</p> : null}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <a href={url} target="_blank" rel="noopener noreferrer">{cta}</a>
    </div>
  </div>
);

const FolderGrid = ({ folders, basePath }) => (
  <div className="card-grid">
    {folders.map((f) => (
      <div className="card" key={f.key}>
        <h3 style={{ marginBottom: 8 }}>{f.name}</h3>
        {f.desc ? <p style={{ marginBottom: 12 }}>{f.desc}</p> : <p style={{ marginBottom: 12 }}>Open the {f.name} folder.</p>}
        <Link to={`${basePath}/${f.key}`}>Open Folder</Link>
      </div>
    ))}
  </div>
);

/** ---------- Global search ---------- */
const ALL_RESOURCES = [
  // Utilitarianism (PDFs + AUDIO + PODCAST)
  { title: "Utilitarianism (Revision Notes)", file: "resources/Utilitarianism.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Utilitarianism — For & Against", file: "resources/Utilitarianism-For-Against.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Utilitarianism — Extra", file: "resources/Utilitarianism-extra.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Bentham — Intro (Audio)", file: "resources/Bentham-intro.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Bentham — Strengths & Weaknesses (Audio)", file: "resources/Bentham-strengths-weaknesses.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Mill — Summary (Audio)", file: "resources/Mill-summary.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  { title: "Defender–Challenger (Audio)", file: "resources/Defender-Challenger.wav", type: "audio", section: "Philosophy/Ethics/Theology › Utilitarianism" },
  {
    title: "In Our Time — Utilitarianism (Apple Podcasts)",
    url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660",
    type: "link",
    section: "Philosophy/Ethics/Theology › Utilitarianism"
  },

  // Kantianism (PDF + AUDIO + PODCAST)
  { title: "Kant — Main Concepts (Revision Notes)", file: "resources/Kant-Main-Concepts.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "Kant — SEP 1 (Audio)", file: "resources/Kant-SEP1.wav", type: "audio", section: "Philosophy/Ethics/Theology › Kantianism" },
  { title: "Kant — SEP 2 (Audio)", file: "resources/Kant-SEP2.wav", type: "audio", section: "Philosophy/Ethics/Theology › Kantianism" },

  // Augustine (PDFs)
  { title: "Augustine-Notes", file: "resources/Augustine-Notes.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "Reflections-Paul", file: "resources/Reflections-Paul.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },
  { title: "Kierkegaard-Original-Sin", file: "resources/Kierkegaard-Original-Sin.pdf", type: "pdf", section: "Philosophy/Ethics/Theology › Augustine" },

  // Mind Maps
  { title: "Metaethics — Cognitivism (Mind Map)", file: "resources/Metaethics-Cognitivism.pdf", type: "pdf", section: "Mind Maps" },
  { title: "Metaethics — Non-Cognitivism (Mind Map)", file: "resources/Metaethics-Non-Cognitivism.pdf", type: "pdf", section: "Mind Maps" },

  // Practice Questions
  { title: "Exam-Questions (Practice Pack)", file: "resources/Exam-Questions.pdf", type: "pdf", section: "Practice Questions" }
];

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function HeaderSearchPanel({ open, onClose }) {
  const [q, setQ] = React.useState("");
  const query = normalize(q);
  const panelRef = React.useRef(null);

  const results = React.useMemo(() => {
    if (!query) return [];
    const tokens = query.split(/\s+/).filter(Boolean);
    return ALL_RESOURCES.filter((r) => {
      const hay = normalize(`${r.title} ${r.section}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [query]);

  React.useEffect(() => {
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
        transition: "max-height 200ms ease, border-bottom-color 200ms ease",
        maxHeight: open ? "70vh" : 0,
        overflowY: open ? "auto" : "hidden",
        borderBottom: open ? "1px solid #e5e7eb" : "1px solid transparent",
        background: "#fff",
        boxShadow: open ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
      }}
      aria-hidden={!open}
    >
      <div className="container" style={{ paddingTop: 12, paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <input
            autoFocus={open}
            aria-label="Search resources"
            placeholder="Type to search (e.g., utilitarianism, Kant, Augustine, mind map)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 16
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 8,
              padding: "8px 10px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>

        {query ? (
          <>
            <p style={{ margin: "0 0 12px 0" }}>
              {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
            </p>
            <div className="card-grid">
              {results.map((r) => {
                if (r.type === "audio") {
                  return <AudioCard key={`${r.type}:${r.file || r.url}`} title={r.title} file={r.file} desc={r.section} />;
                }
                if (r.type === "link") {
                  return <ExternalLinkCard key={`${r.type}:${r.url}`} title={r.title} url={r.url} desc={r.section} cta="Open Podcast" />;
                }
                return <DownloadCard key={`${r.type}:${r.file}`} title={r.title} file={r.file} desc={r.section} />;
              })}
            </div>
          </>
        ) : (
          <p style={{ color: "#6b7280", margin: 0 }}>
            Tip: try terms like <em>utilitarianism</em>, <em>Kant</em>, <em>Augustine</em>, <em>mind map</em>.
          </p>
        )}
      </div>
    </div>
  );
}

/** === App === */
function App() {
  // Force eggshell background
  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-eggshell-override", "true");
    style.textContent = `
      html, body, #root { background-color: #F0EAD6 !important; }
      .App { background-color: #F0EAD6 !important; }
      .section { background-color: transparent !important; }
      .header, .hero, footer { background: transparent !important; background-color: transparent !important; }
      #search-panel > div { background-color: #F0EAD6 !important; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/intro-philosophy-ethics" element={<IntroPhilosophyEthics />} />
        <Route path="/philosophy-fundamentals" element={<PhilosophyFundamentals />} />
        <Route path="/philosophy-basics" element={<PhilosophyBasics />} />

        {/* Philosophy/Ethics/Theology: folder index + subfolders */}
        <Route path="/philosophy-ethics-revision" element={<PhilosophyEthicsRevision />} />
        <Route path="/philosophy-ethics-revision/utilitarianism" element={<RevisionUtilitarianism />} />
        <Route path="/philosophy-ethics-revision/kantianism" element={<RevisionKantianism />} />
        <Route path="/philosophy-ethics-revision/augustine" element={<RevisionAugustine />} />

        {/* Mind Maps */}
        <Route path="/philosophy-ethics-mind-maps" element={<PhilosophyEthicsMindMaps />} />

        {/* Practice questions */}
        <Route path="/philosophy-ethics-questions" element={<PhilosophyEthicsQuestions />} />
      </Routes>
    </Router>
  );
}

/** === Main page === */
function MainLayout() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [status, setStatus] = React.useState({ state: "idle", message: "" });

  async function handleContactSubmit(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "Sending…" });

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      message: (formData.get("message") || "").toString().trim()
    };

    try {
      const res = await fetch(CONTACT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send message.");

      setStatus({ state: "success", message: "Thanks! Your message was sent." });
      form.reset();
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Something went wrong." });
    }
  }

  return (
    <div className="App">
      <header className="header">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0 }}>EduResources</h1>
          <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span
              onMouseEnter={() => setSearchOpen(true)}
              onFocus={() => setSearchOpen(true)}
              style={{ position: "relative" }}
            >
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setSearchOpen((v) => !v); }}
                aria-expanded={searchOpen}
                aria-controls="search-panel"
                title="Search resources"
              >
                Search
              </a>
            </span>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>

        <div id="search-panel">
          <HeaderSearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      </header>

      <section id="home" className="hero">
        <div className="container">
          <h2>Sapere aude !</h2>
        </div>
      </section>

      <section id="resources" className="section">
        <div className="container">
          <h2>Resources</h2>
          <p>Browse our collection of tutorials and revision tools.</p>

          {/* Tutorials */}
          <h3>Tutorials</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Introduction to Philosophy and Ethics</h3>
              <p>Basic concepts and examples explained simply.</p>
              <Link to="/intro-philosophy-ethics">View Resources</Link>
            </div>
            <div className="card">
              <h3>Philosophy Fundamentals</h3>
              <p>Key principles for beginners.</p>
              <Link to="/philosophy-fundamentals">View Resources</Link>
            </div>
            <div className="card">
              <h3>Philosophy Basics</h3>
              <p>Start your journey with easy steps.</p>
              <Link to="/philosophy-basics">View Resources</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <h2>About Us</h2>
          <p>
            EduResources is dedicated to providing free, accessible learning materials in a clean, minimal design.
            We focus on quality over quantity to help learners succeed.
          </p>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container">
          <h2>Contact</h2>
          <form onSubmit={handleContactSubmit} noValidate>
            <label htmlFor="name">Name</label>
            <input name="name" type="text" id="name" placeholder="Your name" required />

            <label htmlFor="email">Email</label>
            <input name="email" type="email" id="email" placeholder="your@email.com" required />

            <label htmlFor="message">Message</label>
            <textarea name="message" id="message" rows="4" placeholder="Your message" required></textarea>

            <button type="submit" disabled={status.state === "loading"}>
              {status.state === "loading" ? "Sending…" : "Send"}
            </button>

            {status.state === "success" && (
              <p role="status" style={{ color: "green", marginTop: 8 }}>{status.message}</p>
            )}
            {status.state === "error" && (
              <p role="alert" style={{ color: "crimson", marginTop: 8 }}>{status.message}</p>
            )}
          </form>
        </div>
      </section>

      <footer>
        <p>&copy; 2025 EduResources. All rights reserved.</p>
      </footer>
    </div>
  );
}

/** === Placeholder pages === */
function IntroPhilosophyEthics() {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <h2>Introduction to Philosophy and Ethics Resources</h2>
          <div className="card-grid"></div>
          <Link to="/" className="btn">Back to Main Page</Link>
        </div>
      </section>
    </div>
  );
}

function PhilosophyFundamentals() {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <h2>Philosophy Fundamentals Resources</h2>
          <div className="card-grid"></div>
          <Link to="/" className="btn">Back to Main Page</Link>
        </div>
      </section>
    </div>
  );
}

function PhilosophyBasics() {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <h2>Philosophy Basics Resources</h2>
          <div className="card-grid"></div>
          <Link to="/" className="btn">Back to Main Page</Link>
        </div>
      </section>
    </div>
  );
}

/** === Folder index & subpages (unchanged) === */
function PhilosophyEthicsRevision() {
  const folders = [
    { key: "utilitarianism", name: "Utilitarianism", desc: "Notes, arguments, audio summaries, and a key episode link." },
    { key: "kantianism", name: "Kantianism", desc: "Main concepts and short SEP-themed audio summaries." },
    { key: "augustine", name: "Augustine", desc: "Notes on Augustine, Paul, and original sin (+ podcast)." }
  ];

  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16 }}>
            <Link to="/">← Back to Main Page</Link>
          </nav>
          <h2>Philosophy/Ethics/Theology resources</h2>
          <p>Select a folder to view and download resources.</p>
          <FolderGrid folders={folders} basePath="/philosophy-ethics-revision" />
        </div>
      </section>
    </div>
  );
}

function RevisionUtilitarianism() {
  const pdfResources = [
    { title: "Utilitarianism (Revision Notes)", file: "resources/Utilitarianism.pdf", desc: "Concise notes on core utilitarian ideas and key distinctions." },
    { title: "Utilitarianism — For & Against", file: "resources/Utilitarianism-For-Against.pdf", desc: "Arguments in favour of and against utilitarianism, in outline." },
    { title: "Utilitarianism — Extra", file: "resources/Utilitarianism-extra.pdf", desc: "Additional notes and materials." }
  ];
  const audioResources = [
    { title: "Bentham — Intro (Audio)", file: "resources/Bentham-intro.wav", desc: "Short introduction to Bentham’s version of utilitarianism." },
    { title: "Bentham — Strengths & Weaknesses (Audio)", file: "resources/Bentham-strengths-weaknesses.wav", desc: "Key advantages and criticisms of Bentham’s approach." },
    { title: "Mill — Summary (Audio)", file: "resources/Mill-summary.wav", desc: "Brief overview of J. S. Mill’s refinements to utilitarianism." },
    { title: "Defender–Challenger (Audio)", file: "resources/Defender-Challenger.wav", desc: "Contrasting a defender of utilitarianism with a challenger." }
  ];
  const linkItems = [
    { title: "In Our Time — Utilitarianism (Apple Podcasts)", url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660", desc: "External episode link (opens in a new tab).", cta: "Open Podcast Episode" }
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/philosophy-ethics-revision">← Back to Philosophy/Ethics/Theology resources</Link>
            <Link to="/">Home</Link>
          </nav>
          <h2>Utilitarianism — Resources</h2>
          <p>Play audio on the page, download PDFs, or open the linked episode.</p>
          <div className="card-grid">
            {pdfResources.map((r) => <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
            {audioResources.map((r) => <AudioCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
            {linkItems.map((p) => <ExternalLinkCard key={p.url} title={p.title} url={p.url} desc={p.desc} cta={p.cta} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function RevisionKantianism() {
  const pdfResources = [
    { title: "Kant — Main Concepts (Revision Notes)", file: "resources/Kant-Main-Concepts.pdf", desc: "Core ideas in Kantian ethics: good will, duty, maxims, and the Categorical Imperative." }
  ];
  const audioResources = [
    { title: "Kant — SEP 1 (Audio)", file: "resources/Kant-SEP1.wav", desc: "A short overview aligned to SEP themes (part 1)." },
    { title: "Kant — SEP 2 (Audio)", file: "resources/Kant-SEP2.wav", desc: "Continuation of the SEP-aligned overview (part 2)." }
  ];
  const linkItems = [
    {
      title: "In Our Time — Kant (Apple Podcasts)",
      url: "https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000392533436",
      desc: "External episode link (opens in a new tab).",
      cta: "Open Podcast Episode"
    }
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/philosophy-ethics-revision">← Back to Philosophy/Ethics/Theology resources</Link>
            <Link to="/">Home</Link>
          </nav>
          <h2>Kantianism — Resources</h2>
          <p>Play audio on the page, download the PDF, or open the linked episode.</p>
          <div className="card-grid">
            {pdfResources.map((r) => <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
            {audioResources.map((r) => <AudioCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
            {linkItems.map((p) => <ExternalLinkCard key={p.url} title={p.title} url={p.url} desc={p.desc} cta={p.cta} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function RevisionAugustine() {
  const pdfResources = [
    { title: "Augustine — Notes", file: "resources/Augustine-Notes.pdf", desc: "Selected notes on Augustine." },
    { title: "Reflections — Paul", file: "resources/Reflections-Paul.pdf", desc: "Pauline reflections related to Augustine’s themes." },
    { title: "Kierkegaard — Original Sin", file: "resources/Kierkegaard-Original-Sin.pdf", desc: "Kierkegaard on sin and responsibility." }
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/philosophy-ethics-revision">← Back to Philosophy/Ethics/Theology resources</Link>
            <Link to="/">Home</Link>
          </nav>
          <h2>Augustine — Resources</h2>
          <p>Download the PDFs below.</p>
          <div className="card-grid">
            {pdfResources.map((r) => <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function PhilosophyEthicsMindMaps() {
  const resources = [
    { title: "Metaethics — Cognitivism (Mind Map)", file: "resources/Metaethics-Cognitivism.pdf", desc: "Overview of cognitivist positions in metaethics." },
    { title: "Metaethics — Non-Cognitivism (Mind Map)", file: "resources/Metaethics-Non-Cognitivism.pdf", desc: "Overview of non-cognitivist positions in metaethics." }
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16 }}>
            <Link to="/">← Back to Main Page</Link>
          </nav>
          <h2>Philosophy and Ethics Mind Maps — Resources</h2>
          <p>Click a resource to download.</p>
          <div className="card-grid">
            {resources.map((r) => <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function PhilosophyEthicsQuestions() {
  const resources = [
    { title: "Exam-Questions (Practice Pack)", file: "resources/Exam-Questions.pdf", desc: "Past-style questions and prompts for practice." }
  ];
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <nav style={{ marginBottom: 16 }}>
            <Link to="/">← Back to Main Page</Link>
          </nav>
          <h2>Philosophy and Ethics Practice Questions — Resources</h2>
          <p>Click a resource to download.</p>
          <div className="card-grid">
            {resources.map((r) => <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
