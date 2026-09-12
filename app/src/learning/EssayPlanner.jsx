import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {ESSAY_STEPS} from './content.js';
import {STORAGE_KEYS, isEssayDraft, makeEssayText} from './state.mjs';
import {SaveStatus, useDeviceSave} from './useDeviceSave.jsx';
import './learning.css';

const EMPTY = {fields: {}, step: 0, mode: 'guided'};

export default function EssayPlanner() {
  const [params] = useSearchParams();
  const question = (params.get('question') || '').slice(0, 4000);
  const [draft, setDraft, saveStatus, retry] = useDeviceSave(STORAGE_KEYS.essay, EMPTY, isEssayDraft);
  const [ignoredQuestion, setIgnoredQuestion] = React.useState('');
  const [exportMessage, setExportMessage] = React.useState('');
  const active = Math.min(draft.step, ESSAY_STEPS.length - 1);
  const completed = ESSAY_STEPS.filter(step => draft.fields[step.id]?.trim()).length;
  const hasWork = Object.values(draft.fields).some(value => value.trim());
  const offerQuestion = question && hasWork && draft.fields.essay_q !== question && ignoredQuestion !== question;
  React.useEffect(() => {
    if (question && question !== ignoredQuestion && !hasWork) setDraft(current => ({...current, fields: {...current.fields, essay_q: question}}));
  }, [question, ignoredQuestion, hasWork, setDraft]);

  function updateField(id, value) { setDraft(current => ({...current, fields: {...current.fields, [id]: value}})); }
  function goTo(index) {
    setDraft(current => ({...current, step: index}));
    requestAnimationFrame(() => document.getElementById(`essay-${ESSAY_STEPS[index].id}`)?.focus());
  }
  function downloadText() {
    const url = URL.createObjectURL(new Blob([makeEssayText(draft.fields, ESSAY_STEPS)], {type: 'text/plain;charset=utf-8'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'philosophy-essay-plan.txt';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportMessage('Text export prepared, including any unfinished prompts.');
  }
  function printPlan() {
    const popup = window.open('', '_blank');
    if (!popup) { setExportMessage('The print window was blocked. Allow pop-ups for this site, or use the text export.'); return; }
    popup.opener = null;
    popup.document.title = 'Philosophy essay plan';
    const style = popup.document.createElement('style');
    style.textContent = 'body{font:12pt Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}@media print{body{margin:0;max-width:none}}';
    const pre = popup.document.createElement('pre');
    pre.textContent = makeEssayText(draft.fields, ESSAY_STEPS);
    popup.document.head.append(style); popup.document.body.append(pre);
    popup.focus();
    setTimeout(() => { if (!popup.closed) popup.print(); }, 100);
    setExportMessage('Print view opened. Choose “Save as PDF” in your print dialog if needed.');
  }
  function renderField(step, index) {
    return <section key={step.id} className="learn-panel essay-field" aria-labelledby={`heading-${step.id}`}>
      <p className="learn-eyebrow">{step.section} · Prompt {index + 1} of {ESSAY_STEPS.length}</p>
      <h2 id={`heading-${step.id}`}>{step.label}</h2>
      <label htmlFor={`essay-${step.id}`}>{step.prompt}</label>
      <p className="learn-help" id={`hint-${step.id}`}>{step.hint}</p>
      <textarea id={`essay-${step.id}`} aria-describedby={`hint-${step.id}`} value={draft.fields[step.id] || ''} onChange={event => updateField(step.id, event.target.value)} rows={draft.mode === 'outline' ? 4 : 8} />
    </section>;
  }
  return <section className="learning-tool essay-planner">
    <header className="learn-header"><p className="learn-eyebrow">WRITE · TEST · RECONSIDER</p><h1>Essay Planner</h1><p>Build an argument, test the strongest objections, and reach your own judgement. You can leave a prompt unfinished and return to it.</p></header>
    <SaveStatus status={saveStatus} retry={retry} />
    {offerQuestion && <section className="learn-notice" aria-label="Question from practice bank">
      <h2>A question is ready to plan</h2><p>{question}</p><p>Your existing draft has been kept. Replacing its question keeps all your other notes.</p>
      <div className="learn-actions"><button type="button" onClick={() => updateField('essay_q', question)}>Use this question in my draft</button><button type="button" onClick={() => setIgnoredQuestion(question)}>Keep current question</button></div>
    </section>}
    <div className="learn-toolbar">
      <div className="learn-actions" role="group" aria-label="Planner view"><button type="button" aria-pressed={draft.mode === 'guided'} onClick={() => setDraft(current => ({...current, mode: 'guided'}))}>Guided view</button><button type="button" aria-pressed={draft.mode === 'outline'} onClick={() => setDraft(current => ({...current, mode: 'outline'}))}>Full outline</button></div>
      <div className="learn-actions"><button type="button" onClick={downloadText}>Export text</button><button type="button" onClick={printPlan}>Print / Save PDF</button></div>
    </div>
    <p className="learn-help" role="status">{completed} of {ESSAY_STEPS.length} prompts have notes. {completed < ESSAY_STEPS.length ? 'Draft — incomplete prompts remain.' : 'All prompts have notes; review the reasoning before you finish.'}</p>
    <progress value={completed} max={ESSAY_STEPS.length} aria-label="Prompts with notes" />
    {exportMessage && <p role="status" className="learn-help">{exportMessage}</p>}
    <div className="essay-layout">
      <nav className="essay-navigation" aria-label="Essay prompts"><ol>{ESSAY_STEPS.map((step, index) => <li key={step.id}><button type="button" aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)}><span>{index + 1}. {step.section}: {step.label}</span><span className="learn-help">{draft.fields[step.id]?.trim() ? 'Has notes' : 'Unfinished'}</span></button></li>)}</ol></nav>
      <div className="essay-editor">{draft.mode === 'outline' ? ESSAY_STEPS.map(renderField) : renderField(ESSAY_STEPS[active], active)}
        {draft.mode === 'guided' && <div className="learn-actions learn-between"><button type="button" disabled={active === 0} onClick={() => goTo(active - 1)}>Previous prompt</button>{active < ESSAY_STEPS.length - 1 ? <button type="button" onClick={() => goTo(active + 1)}>{draft.fields[ESSAY_STEPS[active].id]?.trim() ? 'Next prompt' : 'Leave unfinished and continue'}</button> : <button type="button" onClick={() => setDraft(current => ({...current, mode: 'outline'}))}>Review the full plan</button>}</div>}
      </div>
    </div>
    <div className="learn-footer"><button type="button" onClick={() => { if (window.confirm('Clear this essay plan on this device? Export it first if you want to keep a copy.')) { setDraft(EMPTY); setIgnoredQuestion(question); } }}>Clear essay plan</button></div>
  </section>;
}
