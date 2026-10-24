import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {FLASHCARDS} from './content.js';
import {STORAGE_KEYS, isReviewRecord, matchingCards} from './state.mjs';
import {SaveStatus, SourceLinks, useDeviceSave} from './useDeviceSave.jsx';
import './learning.css';

const FILTERS = {all: 'All topics', kantianism: 'Kantianism', utilitarianism: 'Utilitarianism', 'objection-util': 'Objections to utilitarianism', 'objection-kant': 'Objections to Kantianism'};
const normaliseTopic = topic => ({kant: 'kantianism', utilitarian: 'utilitarianism'}[topic] || topic || 'all');

export default function Flashcards() {
  const [params, setParams] = useSearchParams();
  const topic = normaliseTopic(params.get('topic'));
  const [reviews, setReviews, saveStatus, retry] = useDeviceSave(STORAGE_KEYS.cards, {}, isReviewRecord);
  const [queueOnly, setQueueOnly] = React.useState(false);
  const [order, setOrder] = React.useState(FLASHCARDS.map(card => card.id));
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const cards = matchingCards(FLASHCARDS, topic, reviews, queueOnly).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const position = Math.min(index, Math.max(0, cards.length - 1));
  const card = cards[position];
  const knownCount = FLASHCARDS.filter(item => reviews[item.id] === 'confident').length;
  const queueCount = matchingCards(FLASHCARDS, topic, reviews, true).length;
  React.useEffect(() => { setIndex(0); setRevealed(false); }, [topic, queueOnly]);
  React.useEffect(() => { setRevealed(false); }, [card?.id]);

  const root = React.useRef(null);
  const revealButton = React.useRef(null);
  const refocus = React.useRef(false);
  // When the focused element is about to disappear with the answer (a rating button or a source link),
  // focus moves to "Reveal answer" on the card now shown, or to the tool itself if no card is left.
  const keepFocus = () => { if (document.getElementById('flashcard-answer')?.contains(document.activeElement)) refocus.current = true; };
  React.useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    (revealButton.current || root.current)?.focus();
  });
  function move(delta) { keepFocus(); setIndex((position + delta + cards.length) % cards.length); setRevealed(false); }
  // Rating a card moves on to the next one, so a run through a set needs one action per card.
  function rate(value, advance = true) {
    setReviews(current => ({...current, [card.id]: value}));
    const rated = `${card.concept}: ${value === 'confident' ? 'marked confident / known' : `marked ${value}`}. This is your self-assessment.`;
    const next = cards[position + 1];
    if (!advance) { setAnnouncement(rated); return; }
    if (queueOnly && value === 'confident') { // the card leaves the queue; the next one takes its place
      const shown = next || cards[position - 1];
      keepFocus(); setRevealed(false);
      setAnnouncement(`${rated} It leaves the review queue. ${shown ? `Now showing: ${shown.concept}.` : 'No uncertain cards remain in this topic.'}`);
      return;
    }
    if (!next) { setAnnouncement(`${rated} That was the last card in this set.`); return; }
    move(1);
    setAnnouncement(`${rated} Next card: ${next.concept}.`);
  }
  // Keyboard shortcuts, active only while focus is inside this tool (click the card or Tab into it), so they
  // cannot interfere with the rest of the page: arrows change card, Space reveals, 1–3 rate a revealed card.
  function onKeyDown(event) {
    if (!card || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = event.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
    const onControl = ['BUTTON', 'A', 'SUMMARY'].includes(tag); // Space and Enter already activate these
    if (event.key === 'ArrowRight' && cards.length > 1) { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowLeft' && cards.length > 1) { event.preventDefault(); move(-1); }
    else if (event.key === ' ' && !onControl) { event.preventDefault(); setRevealed(value => !value); }
    else if (['1', '2', '3'].includes(event.key) && revealed) rate(['again', 'unsure', 'confident'][Number(event.key) - 1]);
  }
  function shuffle() {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    setOrder(shuffled); setIndex(0); setRevealed(false); setAnnouncement('Cards shuffled.');
  }
  function changeTopic(value) { setIndex(0); setRevealed(false); const next = new URLSearchParams(params); if (value === 'all') next.delete('topic'); else next.set('topic', value); setParams(next); }

  return <section ref={root} tabIndex={-1} onKeyDown={onKeyDown} className="learning-tool flashcards-tool">
    <header className="learn-header"><p className="learn-eyebrow">RETRIEVE · EXPLAIN · REVIEW</p><h1>Philosophy Flashcards</h1><p>Recall a definition and an example before revealing the answer. Use your confidence to decide what to revisit.</p></header>
    <SaveStatus status={saveStatus} retry={retry} />
    <div className="learn-toolbar"><div><label htmlFor="flashcard-topic">Topic</label><select id="flashcard-topic" value={topic} onChange={event => changeTopic(event.target.value)}>{!FILTERS[topic] && <option value={topic}>{topic} — no cards yet</option>}{Object.entries(FILTERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="learn-actions"><button type="button" aria-pressed={queueOnly} onClick={() => setQueueOnly(value => !value)}>{queueOnly ? 'Show all cards in topic' : `Review uncertain cards (${queueCount})`}</button><button type="button" onClick={shuffle} disabled={cards.length < 2}>Shuffle</button></div></div>
    <p className="learn-help">{knownCount} of {FLASHCARDS.length} cards marked confident / known. Confidence is self-reported, not a score.</p>
    <progress max={FLASHCARDS.length} value={knownCount} aria-label="Cards marked confident" />
    <p className="learn-sr-only" role="status">{announcement}</p>
    {card ? <>
      <article className="learn-panel flashcard" aria-labelledby="flashcard-heading">
        <div className="learn-between"><p className="learn-eyebrow">{FILTERS[card.tag]} · {card.thinker}</p><span className="learn-badge">{position + 1} / {cards.length}</span></div>
        <h2 id="flashcard-heading">{card.concept}</h2>
        {!revealed && <p className="learn-help">Explain the concept in your own words. Can you give an example or an objection?</p>}
        <button type="button" ref={revealButton} className="learn-primary" aria-expanded={revealed} aria-controls="flashcard-answer" aria-keyshortcuts="Space" onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
        {revealed && <div id="flashcard-answer" className="flashcard-answer"><p>{card.definition}</p><SourceLinks sources={card.sources} /><p className="learn-help">How well did your answer match? For an objection, consider how a defender might reply. Rating moves you to the next card.</p><div className="learn-actions" role="group" aria-label="Rate your recall">{[['again', 'Again', '1'], ['unsure', 'Unsure', '2'], ['confident', 'Confident / known', '3']].map(([value, label, key]) => <button type="button" key={value} aria-pressed={reviews[card.id] === value} aria-keyshortcuts={key} onClick={() => rate(value)}>{label}</button>)}</div></div>}
        <p className="learn-help">Your rating: {reviews[card.id] || 'not yet reviewed'}{reviews[card.id] === 'confident' && <> · <button type="button" className="learn-text-button" onClick={() => rate('unsure', false)}>Unmark known</button></>}</p>
      </article>
      <div className="learn-actions learn-between"><button type="button" aria-keyshortcuts="ArrowLeft" onClick={() => move(-1)} disabled={cards.length < 2}>Previous card</button><button type="button" aria-keyshortcuts="ArrowRight" onClick={() => move(1)} disabled={cards.length < 2}>Next card</button></div>
      <p className="learn-help learn-keys">Keyboard, once the card area has focus (click it or Tab into it): <kbd>←</kbd> <kbd>→</kbd> change card · <kbd>Space</kbd> reveal or hide · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> rate Again, Unsure, Confident.</p>
      <details className="learn-panel"><summary>Choose a card ({cards.length})</summary><ol className="flashcard-list">{cards.map((item, i) => <li key={item.id}><button type="button" aria-current={i === position ? 'true' : undefined} onClick={() => {setIndex(i); setRevealed(false);}}>{item.concept}<span className="learn-help">{reviews[item.id] === 'confident' ? 'Known' : reviews[item.id] || 'Not reviewed'}</span></button></li>)}</ol></details>
    </> : <section className="learn-panel"><h2>{queueOnly ? 'No uncertain cards in this topic' : 'No flashcards for this topic yet'}</h2><p>{queueOnly ? 'Cards marked Again or Unsure appear here. You can review the full topic at any time.' : 'The current set covers Kantianism, utilitarianism, and objections to both.'}</p><button type="button" onClick={() => {setQueueOnly(false); if (!matchingCards(FLASHCARDS, topic).length) changeTopic('all');}}>Browse cards</button></section>}
    <div className="learn-footer"><button type="button" onClick={() => {
      if (!window.confirm('Reset all flashcard confidence ratings on this device and restore the original order? Essay and logic work will be kept.')) return;
      setReviews({}); setOrder(FLASHCARDS.map(item => item.id)); setIndex(0); setRevealed(false); setQueueOnly(false); setAnnouncement('Flashcard ratings and order reset.');
    }}>Reset flashcard reviews</button></div>
  </section>;
}
