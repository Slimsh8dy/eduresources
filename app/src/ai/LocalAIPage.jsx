import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAI } from './AiProvider.jsx';
import { resourceTarget, studyContext } from './grounding.mjs';

const statusText = {
  idle: 'Local AI is off.', checking: 'Checking this browser and graphics device…',
  loading: 'Downloading and preparing the model…', ready: 'Ready — answers run on this device.',
  generating: 'Thinking on this device…', unsupported: 'Local AI is unavailable on this browser or device.',
  error: 'Local AI needs attention.', clearing: 'Releasing local model files…',
};

function CatalogLinks({ resources }) {
  const base = import.meta.env?.BASE_URL || '/';
  const links = resources.map(resource => ({ resource, target: resourceTarget(resource, base) })).filter(item => item.target);
  if (!links.length) return null;
  return <div className="local-ai-sources">
    <p><strong>Related site resources</strong> — selected from the site catalog.</p>
    <ul>{links.map(({ resource, target }) => <li key={resource.id || target.href}>
      {target.type === 'route'
        ? <Link to={target.href}>{resource.title}</Link>
        : <a href={target.href}>{resource.title}</a>}
    </li>)}</ul>
  </div>;
}

/** reviewedContent: optional [{ resourceId, title, text }] reviewed study excerpts. */
export default function LocalAIPage({ resources = [], reviewedContent = [] }) {
  const ai = useAI();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [notice, setNotice] = useState('');
  const [asking, setAsking] = useState(false);
  const questionRef = useRef(null);

  async function handleEnable() {
    setNotice('');
    try { await ai.enable(); }
    catch (error) { if (error.name === 'AbortError') setNotice('Stopped. Enable AI again when you are ready. Completed downloads can be reused.'); }
  }

  async function handleAsk(event) {
    event.preventDefault();
    if (!question.trim() || !ai.ready || ai.busy || asking) return;
    const prompt = question.trim();
    const context = studyContext(prompt, resources, reviewedContent);
    setNotice('');
    setAsking(true);
    try {
      const answer = await ai.generate({ system: context.system, prompt, maxTokens: 450 });
      setExchanges(previous => [...previous.slice(-7), { question: prompt, answer, resources: context.resources }]);
      setQuestion('');
      questionRef.current?.focus();
    } catch (error) {
      if (error.name === 'AbortError') setNotice('Answer stopped. Your question is still here; enable AI to try again.');
      else if (error.name === 'BusyError') setNotice(error.message);
    } finally { setAsking(false); }
  }

  async function removeDownload() {
    setNotice('');
    try {
      await ai.clearCache();
      setNotice('The downloaded AI model has been removed. Your study drafts and progress have not been changed.');
    } catch { /* The provider exposes a readable error. */ }
  }

  const loading = ['checking', 'loading'].includes(ai.status);
  return <section className="section local-ai-page" aria-labelledby="local-ai-title">
    <div className="container" style={{ maxWidth: 920 }}>
      <h1 id="local-ai-title">Local AI study assistant</h1>
      <p>Explore a philosophical idea, practise an objection, or find a useful resource. This small model runs in your browser with no account, API key or paid inference service.</p>

      <div className="card local-ai-setup" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Enable it on this device</h2>
        <p>The first use downloads approximately <strong>0.9 GB</strong> of model files; the compatibility version can be larger. Your browser can keep them for later visits. Loading uses graphics memory and may take several minutes. Compatible WebGPU graphics are required.</p>
        <p>Model files are fetched from Hugging Face and the MLC project. Your questions are processed locally and are not sent to an inference service. Downloads still contact those hosting providers. Browser storage may be cleared or evicted.</p>
        <p>Only enable this when you want the download. Ordinary search, notes and exercises work without it.</p>
        <p role="status" aria-live="polite" aria-atomic="true"><strong>{statusText[ai.status] || ai.status}</strong></p>
        {ai.status === 'loading' && <div>
          <label htmlFor="local-ai-download">Model loading progress</label>
          <progress id="local-ai-download" value={ai.progress?.progress || 0} max="1" style={{ width: '100%' }} />
          <p style={{ fontSize: '.85rem', overflowWrap: 'anywhere' }}>{ai.progress?.text}</p>
        </div>}
        {ai.error && <p role="alert" className="form-error">{ai.error}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!ai.enabled && !ai.busy && <button type="button" onClick={handleEnable}>
            {['unsupported', 'error'].includes(ai.status) ? 'Check and retry local AI' : 'Enable local AI — download model'}
          </button>}
          {(loading || ai.status === 'generating') && <button type="button" onClick={() => { ai.stop(); setNotice('Stopped. Downloaded files can be reused when you enable AI again.'); }}>
            {loading ? 'Cancel loading' : 'Stop answer'}
          </button>}
          {ai.enabled && !ai.busy && <button type="button" onClick={() => ai.unload()}>Unload AI from memory</button>}
          {!ai.busy && <button type="button" onClick={removeDownload}>Remove downloaded model</button>}
        </div>
        <p style={{ fontSize: '.85rem', marginTop: 12 }}>Model: Qwen2.5 1.5B Instruct · <a href="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct" target="_blank" rel="noopener noreferrer">Model information and Apache 2.0 license</a> · <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noopener noreferrer">WebLLM</a></p>
      </div>

      <div className="local-ai-chat">
        <h2>Ask a study question</h2>
        <p id="local-ai-help">Ask one focused question at a time. Model answers can be wrong: check important claims against your course materials. This assistant does not mark assessed work or claim to have read the linked PDFs. Questions and answers stay in this page’s memory and are not saved after you leave.</p>
        <form onSubmit={handleAsk} style={{ maxWidth: 'none' }}>
          <label htmlFor="local-ai-question">Your question</label>
          <textarea id="local-ai-question" ref={questionRef} value={question} onChange={event => setQuestion(event.target.value)}
            rows={4} maxLength={1800} aria-describedby="local-ai-help"
            placeholder="For example: How does Kant distinguish acting from duty from acting in accordance with duty?" />
          <button type="submit" disabled={!ai.ready || ai.busy || asking || !question.trim()}>
            {asking ? 'Thinking…' : 'Ask local AI'}
          </button>
        </form>
        {notice && <p role="status" aria-live="polite" style={{ marginTop: 12 }}>{notice}</p>}
        <div aria-live="polite" aria-relevant="additions" aria-label="Study conversation" style={{ marginTop: 24 }}>
          {exchanges.map((exchange, index) => <article className="card local-ai-exchange" key={index} style={{ marginBottom: 16 }}>
            <h3 style={{ textTransform: 'none', letterSpacing: 'normal' }}>{exchange.question}</h3>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{exchange.answer}</p>
            <CatalogLinks resources={exchange.resources} />
          </article>)}
        </div>
        {exchanges.length > 0 && <button type="button" disabled={asking} onClick={() => setExchanges([])}>Clear this conversation</button>}
      </div>
    </div>
  </section>;
}
