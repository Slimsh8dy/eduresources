import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCES } from '../app/src/resources/catalog.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 100 * 1024 * 1024 });

// Recorded from the deployed gh-pages revision d66d244, before this upgrade.
// Keeping immutable checksums also protects audio after the upgrade is committed.
const AUDIO_BASELINE = {
  'Bentham-intro.wav': 'b85b3f6b6c75e3850dcef0cc6ce2a0bf1f014c3262833d5b0c65b0ac3015069d',
  'Bentham-strengths-weaknesses.wav': '3599083efeb152624fd56d964603b221cb4764d86bff47cbc4d73e6a4d886051',
  'Defender-Challenger.wav': '0edca8a8814c1c281d533daf508d67b13c9e9f7f06099b754ea629afa2a01e0c',
  'Kant-SEP1.wav': '7f5cb9245d5a95e7eb3bee56ed46918f10a34936efcb0350363c25e106795f04',
  'Kant-SEP2.wav': '692fd2a901e0770fee19d9453a353fbc718b5c93dbade6ce9c40c31a2f47a055',
  'Mill-summary.wav': 'de17acd85c6d654833fdf8d129d2ead11f50e74c084d1bb9bc7ebcc666af3625',
};
const EXISTING_PDFS = [
  'Augustine-Notes', 'Christianity-exam-questions', 'Ethics-Questions', 'Ethics-mind-map', 'Exam-Questions',
  'GS-1', 'GS-2', 'GT-1', 'GT-2', 'Introduction-to-Logic', 'Kant-Main-Concepts', 'Kant-extra',
  'Kierkegaard-Original-Sin', 'Metaethics-Cognitivism', 'Metaethics-Non-Cognitivism', 'NL-for-against',
  'Natural-Law-notes', 'Oxbridge-Logic-Preparation', 'Reflections-Paul', 'Situation-Ethics-1',
  'Situation-Ethics-2', 'Utilitarianism', 'Utilitarianism-For-Against', 'Utilitarianism-extra',
  'epistemology_introduction', 'moral_epistemology_introduction',
];
const DUPLICATE_PDFS = [
  'Augustine-Notes', 'Christianity-exam-questions', 'Ethics-Questions', 'Ethics-mind-map',
  'GS-1', 'GS-2', 'GT-1', 'GT-2', 'Kant-Main-Concepts', 'Kant-extra', 'Kierkegaard-Original-Sin',
  'Metaethics-Cognitivism', 'NL-for-against', 'Natural-Law-notes', 'Reflections-Paul',
  'Situation-Ethics-1', 'Situation-Ethics-2', 'Utilitarianism', 'Utilitarianism-For-Against', 'Utilitarianism-extra',
];
const STATIC_ROUTES = new Set([
  '/intro-philosophy-ethics', '/philosophy-fundamentals', '/philosophy-fundamentals/logic-problems',
  '/philosophy-basics', '/philosophy-ethics-questions', '/flashcards', '/ai-tutor',
]);
const TOPIC_ROUTES = new Set(['utilitarianism', 'kantianism', 'augustine', 'natural-law', 'situation-ethics', 'metaethics', 'conscience', 'gender-theology']);

test('site catalogue IDs and resource destinations are complete', () => {
  assert.equal(new Set(RESOURCES.map(resource => resource.id)).size, RESOURCES.length);
  for (const resource of RESOURCES) {
    if (resource.file) {
      const resolved = path.resolve(ROOT, resource.file);
      assert.ok(resolved.startsWith(path.join(ROOT, 'resources') + path.sep));
      assert.ok(existsSync(resolved), `Missing ${resource.file}`);
    }
    const topic = resource.route.replace('/philosophy-ethics-revision/', '');
    assert.ok(STATIC_ROUTES.has(resource.route) || TOPIC_ROUTES.has(topic), `Unknown route: ${resource.route}`);
  }
});

test('every resource tracked at HEAD is retained', () => {
  const paths = git(['ls-tree', '-r', '--name-only', '-z', 'HEAD', '--', 'resources']).toString('utf8').split('\0').filter(Boolean);
  assert.ok(paths.length >= 59, 'Expected the original deployed resource inventory');
  for (const resourcePath of paths) assert.ok(existsSync(path.join(ROOT, resourcePath)), `Removed existing asset: ${resourcePath}`);
});

test('original PDF and duplicate asset filenames remain available after a new commit', () => {
  const filenames = [
    ...EXISTING_PDFS.map(name => `${name}.pdf`),
    ...DUPLICATE_PDFS.map(name => `${name} 2.pdf`),
    ...Object.keys(AUDIO_BASELINE),
    ...Object.keys(AUDIO_BASELINE).map(name => name.replace('.wav', ' 2.wav')),
  ];
  assert.equal(filenames.length, 58);
  for (const filename of filenames) assert.ok(existsSync(path.join(ROOT, 'resources', filename)), filename);
});

test('all six linked audio files are byte-identical to HEAD and the original deployed baseline', () => {
  assert.deepEqual(RESOURCES.filter(resource => resource.type === 'audio').map(resource => path.basename(resource.file)).sort(), Object.keys(AUDIO_BASELINE).sort());
  for (const [filename, expected] of Object.entries(AUDIO_BASELINE)) {
    const asset = `resources/${filename}`;
    const workingHash = sha256(readFileSync(path.join(ROOT, asset)));
    assert.equal(workingHash, expected, `Original audio modified: ${asset}`);
    assert.equal(workingHash, sha256(git(['show', `HEAD:${asset}`])), `Audio differs from HEAD: ${asset}`);
    const duplicate = `resources/${filename.replace('.wav', ' 2.wav')}`;
    assert.equal(sha256(readFileSync(path.join(ROOT, duplicate))), expected, `Original duplicate audio modified: ${duplicate}`);
  }
});

test('the Conscience topic has its anthology as a downloadable PDF on its own topic page', () => {
  const anthology = RESOURCES.find(resource => resource.id === 'conscience-anthology');
  assert.ok(anthology, 'catalogue entry missing');
  assert.equal(anthology.type, 'pdf');
  assert.equal(anthology.topic, 'Conscience');
  assert.equal(anthology.route, '/philosophy-ethics-revision/conscience');
  assert.equal(anthology.file, 'resources/Conscience-Extended-Reading-Anthology.pdf');
  const bytes = readFileSync(path.join(ROOT, anthology.file));
  assert.ok(bytes.subarray(0, 5).toString() === '%PDF-', 'not a PDF');
  assert.ok(bytes.length > 100_000, 'file looks truncated');
  assert.match(anthology.desc, /Aquinas/);
  assert.ok(anthology.tags.includes('Freud'));
});

test('the Utilitarianism and Metaethics booklets are complete PDFs at the top of their topic pages', () => {
  const booklets = [
    { id: 'utilitarianism-booklet', topic: 'Utilitarianism', slug: 'utilitarianism', file: 'resources/Utilitarianism-Booklet.pdf', thinkers: ['Bentham', 'Mill', 'Nozick', 'Smart', 'Harris'] },
    { id: 'metaethics-booklet', topic: 'Metaethics', slug: 'metaethics', file: 'resources/Metaethics-Booklet.pdf', thinkers: ['Moore', 'Hume', 'Ross', 'Ayer', 'Stevenson', 'Hare', 'Mackie'] },
  ];
  for (const expected of booklets) {
    const booklet = RESOURCES.find(resource => resource.id === expected.id);
    assert.ok(booklet, `${expected.id}: catalogue entry missing`);
    assert.equal(booklet.type, 'pdf');
    assert.equal(booklet.topic, expected.topic);
    assert.equal(booklet.route, `/philosophy-ethics-revision/${expected.slug}`);
    assert.equal(booklet.file, expected.file);
    assert.ok(booklet.reviewNote, `${expected.id}: reading note missing`);
    for (const thinker of expected.thinkers) assert.ok(booklet.tags.includes(thinker), `${expected.id}: ${thinker} not tagged`);
    const bytes = readFileSync(path.join(ROOT, booklet.file));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `${booklet.file} is not a PDF`);
    assert.match(bytes.subarray(-64).toString('latin1'), /%%EOF\s*$/, `${booklet.file} looks truncated`);
    assert.ok(bytes.length > 1_000_000, `${booklet.file} is smaller than expected`);
    const onPage = RESOURCES.filter(resource => resource.topic === expected.topic && resource.type !== 'tool');
    assert.equal(onPage[0].id, expected.id, `${expected.id} should head its topic page`);
  }
});

test('Metaethics is a topic of its own with the booklet and the mind maps, and the old mind-maps link redirects to it', () => {
  const metaethics = RESOURCES.filter(resource => resource.topic === 'Metaethics');
  assert.deepEqual(metaethics.map(resource => resource.id), ['metaethics-booklet', 'metaethics-cognitivism-map', 'metaethics-noncognitivism-map', 'ethics-overview-map']);
  for (const resource of metaethics) assert.equal(resource.route, '/philosophy-ethics-revision/metaethics');
  assert.ok(!RESOURCES.some(resource => resource.route === '/philosophy-ethics-mind-maps'), 'a resource still points at the retired mind-maps page');
  const app = readFileSync(path.join(ROOT, 'app/src/App.jsx'), 'utf8');
  assert.match(app, /\{ slug: 'metaethics', name: 'Metaethics' \}/);
  assert.match(app, /<Route path="\/philosophy-ethics-mind-maps" element=\{<Navigate to="\/philosophy-ethics-revision\/metaethics" replace \/>\} \/>/);
});
