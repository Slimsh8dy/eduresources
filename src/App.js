import React from 'react';
import './App.css';

function App() {
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
          <p>This free platform provides minimal, focused educational materials to help you learn and revise effectively.</p>
          <a href="#resources" className="btn">Explore Resources</a>
          <a href="#contact" className="btn secondary">Get in Touch</a>
        </div>
      </section>
      <section id="resources" className="section">
        <div className="container">
          <h2>Resources</h2>
          <p>Browse our collection of tutorials and revision tools.</p>
          <h3>Tutorials</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Introduction to Mathematics</h3>
              <p>Basic concepts and examples explained simply.</p>
              <a href="#">View Tutorial</a>
            </div>
            <div className="card">
              <h3>Science Fundamentals</h3>
              <p>Key principles for beginners.</p>
              <a href="#">View Tutorial</a>
            </div>
            <div className="card">
              <h3>Programming Basics</h3>
              <p>Start your coding journey with easy steps.</p>
              <a href="#">View Tutorial</a>
            </div>
          </div>
          <h3>Revision Resources</h3>
          <div className="card-grid">
            <div className="card">
              <h3>Math Revision Notes</h3>
              <p>Quick summaries and formulas.</p>
              <a href="#">Download Notes</a>
            </div>
            <div className="card">
              <h3>Science Cheat Sheets</h3>
              <p>Essential facts at a glance.</p>
              <a href="#">Download Sheets</a>
            </div>
            <div className="card">
              <h3>Programming Practice Questions</h3>
              <p>Test your skills with exercises.</p>
              <a href="#">View Questions</a>
            </div>
          </div>
        </div>
      </section>
      <section id="visuals" className="section">
        <div className="container">
          <h2>Visualizations</h2>
          <p>Visual aids for understanding essay structure and inferential flow.</p>
          <div className="card">
            <h3>Inferential Flow (Premises → Warrant → Conclusion → Qualification)</h3>
            <VisualInferentialFlow />
          </div>
        </div>
      </section>
      <section id="about" className="section">
        <div className="container">
          <h2>About Us</h2>
          <p>EduResources is dedicated to providing free, accessible learning materials in a clean, minimal design. We focus on quality over quantity to help learners succeed.</p>
        </div>
      </section>
      <section id="contact" className="section">
        <div className="container">
          <h2>Contact</h2>
          <p>Reach out with questions or suggestions.</p>
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

const VisualInferentialFlow = () => (
  <div className="w-full overflow-x-auto">
    <svg viewBox="0 0 900 260" className="w-[900px] h-[260px]">
      <defs>
        <marker id="arrow2" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" />
        </marker>
      </defs>
      {/* Nodes */}
      {[
        { id: "p1", x: 80, y: 60, label: "P1" },
        { id: "p2", x: 80, y: 160, label: "P2" },
        { id: "w1", x: 280, y: 110, label: "Warrant" },
        { id: "d1", x: 280, y: 200, label: "Defeater?" },
        { id: "c", x: 520, y: 110, label: "Conclusion" },
        { id: "q", x: 720, y: 110, label: "Qualification" },
      ].map((n) => (
        <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
          <rect width="120" height="40" rx="10" className="fill-white stroke-[1.5]" />
          <text x="12" y="24" className="text-[12px]">{n.label}</text>
        </g>
      ))}
      {/* Edges */}
      <line x1="200" y1="80" x2="280" y2="120" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="200" y1="180" x2="280" y2="140" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="400" y1="130" x2="520" y2="130" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="640" y1="130" x2="720" y2="130" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <line x1="340" y1="220" x2="520" y2="150" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <g transform="translate(60, 10)">
        <text className="text-[12px]">Inferential Flow (Toulmin-flavoured)</text>
      </g>
    </svg>
  </div>
);

export default App;