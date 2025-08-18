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
  // Fallback: prefix with the deployment path (e.g., "/REPO-NAME/") on GitHub Pages.
  (typeof window !== "undefined" ? window.location.pathname : "/");

const asset = (p) => {
  const base = BASE.endsWith("/") ? BASE : BASE + "/";
  const path = String(p).replace(/^\//, "");
  // Avoid accidental double slashes
  const full = (base + path).replace(/\/{2,}/g, "/");
  return full;
};

/** Reusable resource card for PDFs (download only) */
const DownloadCard = ({ title, file, desc }) => {
  const href = encodeURI(asset(file));
  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {desc ? <p style={{ marginBottom: 12 }}>{desc}</p> : null}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href={href} download>
          Download PDF
        </a>
      </div>
    </div>
  );
};

/** === App === */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/intro-philosophy-ethics" element={<IntroPhilosophyEthics />} />
        <Route path="/philosophy-fundamentals" element={<PhilosophyFundamentals />} />
        <Route path="/philosophy-basics" element={<PhilosophyBasics />} />
        <Route path="/philosophy-ethics-revision" element={<PhilosophyEthicsRevision />} />
        {/* Mind Maps folder: now shows download-only cards */}
        <Route path="/philosophy-ethics-mind-maps" element={<PhilosophyEthicsMindMaps />} />
        <Route path="/philosophy-ethics-questions" element={<PhilosophyEthicsQuestions />} />
      </Routes>
    </Router>
  );
}

/** === Main page === */
function MainLayout() {
  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>EduResources</h1>
          <nav>
            <a href="#home">Home</a>
            <a href="#resources">Resources</a>
            <a href="#visuals">Visualizations</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <section id="home" className="hero">
        <div className="container">
          <h2>Access High-Quality Tutorials and Revision Resources</h2>
        </div>
      </section>

      <section id="resources" className="section">
        <div className="container">
          <h2>Resources</h2>
          <p>Browse our collection of tutorials and revision tools.</p>

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

          <h3>Revision Resources</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Philosophy and Ethics Revision Notes</h3>
              <p>Quick summaries and key points.</p>
              <Link to="/philosophy-ethics-revision">View Resources</Link>
            </div>
            <div className="card">
              <h3>Philosophy and Ethics Mind Maps</h3>
              <p>Essential visual aids at a glance.</p>
              <Link to="/philosophy-ethics-mind-maps">Open Folder</Link>
            </div>
            <div className="card">
              <h3>Philosophy and Ethics Practice Questions</h3>
              <p>Test your skills with exercises.</p>
              <Link to="/philosophy-ethics-questions">View Resources</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="visuals" className="section">
        <div className="container">
          <h2>Visualizations</h2>
          <div className="card">
            <h3>Inferential Articulation (Premises → Warrant → Conclusion → Repeat)</h3>
            <VisualInferentialFlow />
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
          <form>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" placeholder="Your name" />
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="your@email.com" />
            <label htmlFor="message">Message</label>
            <textarea id="message" rows="4" placeholder="Your message"></textarea>
            <button type="submit">Send</button>
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

function PhilosophyEthicsRevision() {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <h2>Philosophy and Ethics Revision Notes Resources</h2>
          <div className="card-grid"></div>
          <Link to="/" className="btn">Back to Main Page</Link>
        </div>
      </section>
    </div>
  );
}

/** === Mind Maps folder (download-only grid) === */
function PhilosophyEthicsMindMaps() {
  const resources = [
    {
      title: "Metaethics — Cognitivism (Mind Map)",
      file: "resources/Metaethics-Cognitivism.pdf",
      desc: "Overview of cognitivist positions in metaethics.",
    },
    {
      title: "Metaethics — Non-Cognitivism (Mind Map)",
      file: "resources/Metaethics-Non-Cognitivism.pdf",
      desc: "Overview of non-cognitivist positions in metaethics.",
    },
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
            {resources.map((r) => (
              <DownloadCard key={r.file} title={r.title} file={r.file} desc={r.desc} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PhilosophyEthicsQuestions() {
  return (
    <div className="App">
      <section className="section">
        <div className="container">
          <h2>Philosophy and Ethics Practice Questions Resources</h2>
          <div className="card-grid"></div>
          <Link to="/" className="btn">Back to Main Page</Link>
        </div>
      </section>
    </div>
  );
}

/** === Visualization component === */
const VisualInferentialFlow = () => (
  <div className="w-full overflow-x-auto">
    <svg viewBox="0 0 900 260" className="w-[900px] h-[260px]">
      <defs>
        <marker
          id="arrow2"
          markerWidth="10"
          markerHeight="10"
          refX="10"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" />
        </marker>
      </defs>
      {[
        { id: "p1", x: 80, y: 60, label: "P1" },
        { id: "p2", x: 80, y: 160, label: "P2" },
        { id: "w1", x: 280, y: 110, label: "Warrant" },
        { id: "d1", x: 280, y: 200, label: "Defeater?" },
        { id: "c", x: 520, y: 110, label: "Conclusion" },
        { id: "q", x: 720, y: 110, label: "Repeat" },
      ].map((n) => (
        <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
          <rect width="120" height="40" rx="10" className="fill-white stroke-[1.5]" />
          <text x="12" y="24" className="text-[12px]">
            {n.label}
          </text>
        </g>
      ))}
      <line x1="200" y1="80" x2="280" y2="120" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="200" y1="180" x2="280" y2="140" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="400" y1="130" x2="520" y2="130" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="640" y1="130" x2="720" y2="130" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="340" y1="220" x2="520" y2="150" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <g transform="translate(60, 10)">
        <text className="text-[12px]">Inferential Flow</text>
      </g>
    </svg>
  </div>
);

export default App;
