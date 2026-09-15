import React from 'react';
import { RESOURCES } from './catalog';
import './resources.css';

const base = import.meta.env.BASE_URL;
const compilations = RESOURCES.filter(resource => resource.id.startsWith('legacy-'));

export default function QuestionsPage() {
  return (
    <section className="questions-page">
      <h1>Questions</h1>
      <h2>Older question compilations (unverified, unofficial)</h2>
      <p className="questions-notice">These existing files are retained for reference. They are third-party or unattributed compilations, not official exam papers. Their exam-board, difficulty, and prediction claims have not been verified. Check the current specification with your teacher; do not treat them as forecasts.</p>
      <ul className="card-grid question-compilations">
        {compilations.map(resource => (
          <li className="card resource-card" id={resource.id} key={resource.id}>
            <h3>{resource.title} (PDF)</h3>
            <div className="actions">
              <a href={`${base}${resource.file}`} target="_blank" rel="noopener noreferrer">Read PDF <span className="sr-only">{resource.title} (new tab)</span><span aria-hidden="true">↗</span></a>
              <a href={`${base}${resource.file}`} download>Download PDF <span className="sr-only">{resource.title}</span><span aria-hidden="true">↓</span></a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
