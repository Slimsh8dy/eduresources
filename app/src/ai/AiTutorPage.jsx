import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAI } from './AiProvider.jsx';
import { TUTOR_MODEL_LABEL } from './config.js';
import { resourceTarget } from './grounding.mjs';

function CatalogLinks({ resources }) {
  const base = import.meta.env?.BASE_URL || '/';
  const links = resources.map(resource => ({ resource, target: resourceTarget(resource, base) })).filter(item => item.target);
  if (!links.length) return null;
  return <p className="tutor-sources">Related on this site: {links.map(({ resource, target }, index) => <React.Fragment key={resource.id || target.href}>
    {index > 0 && ' · '}
    {target.type === 'route' ? <Link to={target.href}>{resource.title}</Link> : <a href={target.href}>{resource.title}</a>}
  </React.Fragment>)}</p>;
}

export default function AiTutorPage() {
  const ai = useAI();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [live, setLive] = useState(null); // { question, answer } while an answer streams in
  const [notice, setNotice] = useState('');
  const questionRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { if (live) endRef.current?.scrollIntoView({ block: 'nearest' }); }, [live?.answer]);

  async function handleAsk(event) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || ai.busy || !ai.configured) return;
    setNotice('');
    setLive({ question: prompt, answer: '' });
    try {
      const result = await ai.ask(prompt, { onDelta: text => setLive({ question: prompt, answer: text }) });
      setExchanges(previous => [...previous.slice(-11), { question: prompt, ...result }]);
      setQuestion('');
      questionRef.current?.focus();
    } catch (error) {
      if (error.name === 'AbortError') setNotice('Stopped. Your question is still in the box.');
      else if (error.name === 'BusyError') setNotice(error.message);
    } finally {
      setLive(null);
    }
  }

  return <section className="tutor-page" aria-labelledby="tutor-title">
    <h1 id="tutor-title">AI tutor</h1>
    <p className="lede">Ask about a concept, test an objection, or find the right resource. The tutor answers with a short explanation and a question back to you. It can be wrong — check anything that matters against your course materials.</p>

    {!ai.configured && <p className="tutor-notice" role="status">The tutor is not connected yet. Everything else on the site works as usual.</p>}

    <form onSubmit={handleAsk} className="tutor-form">
      <label htmlFor="tutor-question">Your question</label>
      <textarea id="tutor-question" ref={questionRef} value={question} onChange={event => setQuestion(event.target.value)}
        rows={3} maxLength={1800} aria-describedby="tutor-help" disabled={!ai.configured}
        placeholder="For example: How does Kant distinguish acting from duty from acting in accordance with duty?" />
      <p id="tutor-help" className="tutor-help">One focused question at a time. Please do not include personal information.</p>
      <div className="tutor-actions">
        <button type="submit" className="primary" disabled={!ai.configured || ai.busy || !question.trim()}>{ai.busy ? 'Answering…' : 'Ask'}</button>
        {ai.busy && <button type="button" onClick={() => ai.stop()}>Stop</button>}
        {exchanges.length > 0 && !ai.busy && <button type="button" className="quiet" onClick={() => setExchanges([])}>Clear conversation</button>}
      </div>
    </form>
    {ai.error && <p role="alert" className="tutor-error">{ai.error}{ai.detail && <><br /><small>Technical detail: {ai.detail}</small></>}</p>}
    {notice && <p role="status" className="tutor-help">{notice}</p>}

    <div className="tutor-conversation" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
      {exchanges.map((exchange, index) => <article className="tutor-exchange" key={index}>
        <h2>{exchange.question}</h2>
        <p className="tutor-answer">{exchange.answer}</p>
        <CatalogLinks resources={exchange.resources || []} />
      </article>)}
      {live && <article className="tutor-exchange is-live">
        <h2>{live.question}</h2>
        <p className="tutor-answer">{live.answer || <span className="tutor-help">Thinking…</span>}</p>
        <div ref={endRef} />
      </article>}
    </div>

    <details className="tutor-about">
      <summary>About this tutor</summary>
      <p>Your question is sent to a small program on Cloudflare, which adds relevant notes from this site and asks the <strong>{TUTOR_MODEL_LABEL}</strong> model (an open-weight model from Google, run on Cloudflare Workers AI) for an answer. Nothing is stored by the site and the conversation disappears when you leave the page. Cloudflare states that it does not use this content to train models.</p>
      <p>The tutor is free to use and shares a daily allowance with everyone who visits. If it runs out, it says so and resets at midnight UTC. There is also a limit of a few questions a minute per person.</p>
      <p>Answers are generated text: they can misattribute a view or invent a reference. The tutor does not mark work and has not read the PDFs in the library; links under an answer come from the site's own catalogue. For practice without AI, try the <Link to="/flashcards">flashcards</Link>, <Link to="/philosophy-fundamentals/logic-problems">logic problems</Link> and the <Link to="/philosophy-basics">essay planner</Link>.</p>
    </details>
  </section>;
}
