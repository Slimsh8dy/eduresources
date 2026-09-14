// Where the tutor lives: the URL of the Cloudflare Worker in worker/ once it is deployed,
// for example 'https://eduresources-tutor.example.workers.dev'. While this is empty the
// site shows a "not connected yet" notice instead of a working tutor.
const DEFAULT_ENDPOINT = 'https://eduresources-tutor.karolosgala.workers.dev';

const trim = value => String(value || '').trim().replace(/\/+$/, '');
export const TUTOR_ENDPOINT = trim(import.meta.env?.VITE_TUTOR_ENDPOINT || DEFAULT_ENDPOINT);
// Shown until the Worker's /health reply supplies the name of the model it is actually running.
export const TUTOR_MODEL_LABEL = 'gpt-oss-120b';
// Mirrors LIMITS in worker/src/tutor.js: about 250 words, so a question rather than an essay.
export const QUESTION_MAX_CHARS = 1500;
