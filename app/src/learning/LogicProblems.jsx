import React from 'react';
import {Link} from 'react-router-dom';
import {useAI} from '../ai/AiProvider';
import {LOGIC_PROBLEMS} from './content.js';
import {STORAGE_KEYS, isLogicAttempts, validateGeneratedProblem, isGeneratedProblemList, buildLogicGenerationRequest} from './state.mjs';
import {SaveStatus, SourceLinks, useDeviceSave} from './useDeviceSave.jsx';
import './learning.css';

const LEVELS = {easy: 'Easy', moderate: 'Moderate', hard: 'Hard'};
const EMPTY_ATTEMPT = {answer: '', revision: '', revealed: false};
const DEFAULT_CHECKLIST = ['I separated the inference from the premises’ truth.', 'I gave a reason or a counterexample.', 'I identified what I would revise or question in this example.'];

function LogicCard({problem, attempt, update}) {
  const [hintOpen, setHintOpen] = React.useState(false);
  const id = `logic-${problem.id}`;
  const checklist = problem.checklist || DEFAULT_CHECKLIST;
  const checks = Array.isArray(attempt.checks) ? attempt.checks : [];
  function toggleCheck(index) { update({checks: checks.includes(index) ? checks.filter(value => value !== index) : [...checks, index]}); }
  return <article className="learn-panel logic-card" aria-labelledby={`${id}-heading`}>
    <div className="learn-between"><p className="learn-eyebrow">{problem.isAI ? 'AI practice' : `Problem ${problem.id}`} · {LEVELS[problem.difficulty]}</p><span className="learn-badge">{attempt.revision.trim() ? 'Revision drafted' : attempt.revealed ? 'Worked example opened' : attempt.answer.trim() ? 'Answer drafted' : 'Not started'}</span></div>
    <h2 id={`${id}-heading`}>{problem.title}</h2>
    {problem.isAI && <p className="learn-notice">AI-generated practice: check the reasoning. This example has not received the editorial review applied to the 12 core problems.</p>}
    <div className="logic-argument" aria-label="Argument">{problem.argument.map((line, index) => <p key={index}>{line}</p>)}</div>
    <p className="logic-question">{problem.question}</p>
    <button type="button" aria-expanded={hintOpen} aria-controls={`${id}-hint`} onClick={() => setHintOpen(value => !value)}>{hintOpen ? 'Hide hint' : 'Show hint'}</button>
    {hintOpen && <p id={`${id}-hint`} className="learn-help">{problem.hint}</p>}
    {!attempt.revealed ? <div className="logic-response"><label htmlFor={`${id}-answer`}>Your initial analysis</label><p className="learn-help" id={`${id}-guidance`}>State what follows from the premises, whether the premises are true, and your reason. Your response is saved, not automatically graded.</p><textarea id={`${id}-answer`} value={attempt.answer} aria-describedby={`${id}-guidance`} onChange={event => update({answer: event.target.value})} rows={5} /><div className="learn-actions"><button type="button" className="learn-primary" disabled={!attempt.answer.trim()} onClick={() => update({revealed: true})}>Compare with worked example</button><button type="button" onClick={() => update({revealed: true})}>I need a worked example</button></div></div> : <div className="logic-comparison">
      <section><h3>Your initial analysis</h3><p className="learn-prewrap">{attempt.answer || 'You opened the worked example without an initial answer. Use it to write your own explanation below.'}</p><button type="button" onClick={() => update({revealed: false})}>Edit initial analysis</button></section>
      <details open className="logic-solution"><summary>Worked example</summary><div className="learn-prewrap">{problem.solution}</div><SourceLinks sources={problem.sources} /></details>
      <fieldset className="logic-checklist"><legend>Compare your reasoning</legend><p className="learn-help">These checks guide your own review; they do not award marks.</p>{checklist.map((item, index) => <label key={item}><input type="checkbox" checked={checks.includes(index)} onChange={() => toggleCheck(index)} /> <span>{item}</span></label>)}</fieldset>
      <label htmlFor={`${id}-revision`}>Your revised explanation</label><p className="learn-help" id={`${id}-revision-help`}>What would you change, and why? You can also defend your answer if you identify a problem with the worked example.</p><textarea id={`${id}-revision`} aria-describedby={`${id}-revision-help`} rows={5} value={attempt.revision} onChange={event => update({revision: event.target.value})} />
    </div>}
  </article>;
}

export default function LogicProblems() {
  const [difficulty, setDifficulty] = React.useState('easy');
  const [attempts, setAttempts, saveStatus, retry] = useDeviceSave(STORAGE_KEYS.logic, {}, isLogicAttempts);
  const [generated, setGenerated, generatedSaveStatus, retryGenerated] = useDeviceSave('eduresources.learning.generated.v1', [], isGeneratedProblemList);
  const [error, setError] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const ai = useAI();
  const core = LOGIC_PROBLEMS.filter(problem => problem.difficulty === difficulty);
  const extras = generated.filter(problem => problem.difficulty === difficulty);
  const started = LOGIC_PROBLEMS.filter(problem => attempts[problem.id]?.answer.trim() || attempts[problem.id]?.revision.trim()).length;
  const revised = LOGIC_PROBLEMS.filter(problem => attempts[problem.id]?.revision.trim()).length;
  function updateAttempt(id, changes) { setAttempts(current => ({...current, [id]: {...EMPTY_ATTEMPT, ...current[id], ...changes}})); }
  async function generateProblem() {
    if (!ai.ready || ai.busy || generating) return;
    setGenerating(true); setError('');
    try {
      const raw = await ai.generate(buildLogicGenerationRequest(difficulty));
      const checked = validateGeneratedProblem(raw);
      const problem = {...checked, id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, difficulty, isAI: true};
      setGenerated(current => [...current, problem]);
    } catch (problem) { setError(problem?.name === 'AbortError' ? 'Generation stopped. Your saved work is unchanged.' : (problem?.message || 'The problem could not be generated. Please try again.')); }
    finally { setGenerating(false); }
  }
  return <section className="learning-tool logic-tool">
    <header className="learn-header"><p className="learn-eyebrow">ANALYSE · COMPARE · REVISE</p><h1>Logic Problem Solver</h1><p>Practise with 12 reviewed problems. Test the inference, examine the premises, then compare and improve your explanation.</p></header>
    <SaveStatus status={saveStatus} retry={retry} />
    <p className="learn-help">{started} of 12 core problems have your notes · {revised} have a revision. Progress records your work, not a grade.</p>
    <div className="learn-actions logic-levels" role="group" aria-label="Problem difficulty">{Object.entries(LEVELS).map(([value, label]) => <button type="button" key={value} aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}>{label} ({LOGIC_PROBLEMS.filter(problem => problem.difficulty === value).length})</button>)}</div>
    {core.map(problem => <LogicCard key={problem.id} problem={problem} attempt={attempts[problem.id] || EMPTY_ATTEMPT} update={changes => updateAttempt(problem.id, changes)} />)}
    <section className="learn-panel logic-generation"><h2>More practice with local AI</h2><p>Generate an additional problem using the model enabled on this device. The original problems are available without AI.</p>
      {!ai.ready ? <p><Link to="/local-ai">Set up local AI</Link> to generate a new practice problem.</p> : <div className="learn-actions"><button type="button" disabled={ai.busy || generating} onClick={generateProblem}>{generating ? 'Generating…' : `Generate ${LEVELS[difficulty].toLowerCase()} problem`}</button>{generating && <button type="button" onClick={ai.stop}>Stop generation</button>}</div>}
      {error && <p className="learn-error" role="alert">{error}</p>}
      {(generated.length > 0 || ['corrupt', 'unavailable'].includes(generatedSaveStatus)) && <SaveStatus status={generatedSaveStatus} retry={retryGenerated} />}
      {extras.length > 0 && <p className="learn-help">{extras.length} saved AI practice {extras.length === 1 ? 'problem' : 'problems'} at this difficulty.</p>}
    </section>
    {extras.map(problem => <LogicCard key={problem.id} problem={problem} attempt={attempts[problem.id] || EMPTY_ATTEMPT} update={changes => updateAttempt(problem.id, changes)} />)}
  </section>;
}
