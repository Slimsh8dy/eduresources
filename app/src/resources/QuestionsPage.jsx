import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QUESTION_TOPICS, PRACTICE_QUESTIONS, SELF_REVIEW_CHECKLIST, PRACTICE_NOTICE, plannerLink, normalizeQuestionTopic } from './questions';
import { RESOURCES } from './catalog';
import './resources.css';

const base = import.meta.env.BASE_URL;

export default function QuestionsPage() {
  const [params, setParams] = useSearchParams();
  const topic = normalizeQuestionTopic(params.get('topic'));
  const [search, setSearch] = useState('');
  const questions = useMemo(() => PRACTICE_QUESTIONS.filter(question =>
    (topic === 'all' || question.topic === topic) && `${question.prompt} ${question.topicLabel} ${question.focus}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [topic, search]);
  const updateTopic = event => {
    const next = new URLSearchParams(params);
    if (event.target.value === 'all') next.delete('topic');
    else next.set('topic', event.target.value);
    setParams(next, { replace: true });
  };
  return (
    <section className="questions-page">
      <p className="eyebrow">Think · argue · evaluate</p>
      <h1>Practice questions</h1>
      <p className="page-intro">Choose a question, build a defensible answer, and test it against an objection.</p>
      <p className="questions-notice">{PRACTICE_NOTICE}</p>
      <div className="question-actions">
        <a className="btn" href={`${base}resources/Practice-Questions-Reviewed.pdf`} target="_blank" rel="noreferrer">Open printable practice pack (PDF)</a>
        <a href={`${base}resources/Practice-Questions-Reviewed.pdf`} download>Download PDF</a>
      </div>
      <details className="question-guidance">
        <summary>How to use these questions and review your answer</summary>
        <p>Start with a short plan: identify what is disputed, choose a provisional judgement, give a reason, and test the strongest objection. Revise your judgement if the objection succeeds. For timed work, use the time and assessment criteria set by your teacher or exam board.</p>
        <ul>{SELF_REVIEW_CHECKLIST.map(item => <li key={item}>{item}</li>)}</ul>
        <p>This is a learning checklist, not a grade calculator. An opposing conclusion can be excellent if it is well supported.</p>
      </details>
      <div className="question-filters">
        <label>Topic<select value={topic} onChange={updateTopic}><option value="all">All topics</option>{QUESTION_TOPICS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Find a question<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try duty, conscience, or consent" /></label>
      </div>
      <p role="status" aria-live="polite">{questions.length} question{questions.length === 1 ? '' : 's'} found.</p>
      {questions.length ? <div className="question-grid">{questions.map(question => (
        <article className="practice-question" key={question.id}>
          <p className="question-category">{question.topicLabel} · {question.focus}</p>
          <h2>{question.prompt}</h2>
          <Link className="question-plan-link" to={plannerLink(question.prompt)} aria-label={`Plan this question: ${question.prompt}`}>Plan this question <span aria-hidden="true">→</span></Link>
        </article>
      ))}</div> : <p className="questions-notice">No questions match. Try another topic or a shorter search.</p>}
      <details className="legacy-resources">
        <summary>Older question compilations (unverified, unofficial)</summary>
        <p>These existing files are retained for reference. They are third-party or unattributed compilations, not official exam papers. Their exam-board, difficulty, and prediction claims have not been verified. Check the current specification with your teacher; do not treat them as forecasts.</p>
        <ul>{RESOURCES.filter(resource => resource.id.startsWith('legacy-')).map(resource => <li key={resource.id}><a href={`${base}${resource.file}`} target="_blank" rel="noreferrer">{resource.title} (PDF)</a></li>)}</ul>
      </details>
    </section>
  );
}
