import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalAIClient, MODEL_IDS } from '../app/src/ai/client.mjs';
import { relatedResources, resourceTarget, studyContext } from '../app/src/ai/grounding.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture(extra = {}) {
  const events = { imports: 0, loads: 0, terminated: 0, deleted: [] };
  const answer = deferred();
  const engine = { interruptGenerate() {}, unload: async () => {}, chat: { completions: { create: request => { events.lastRequest = request; return answer.promise; } } } };
  const client = createLocalAIClient({
    getNavigator: () => ({ gpu: { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) } }),
    loadRuntime: async () => {
      events.imports++;
      return {
        CreateWebWorkerMLCEngine: async () => { events.loads++; return engine; },
        deleteModelAllInfoInCache: async id => { events.deleted.push(id); },
      };
    },
    createWorker: () => ({ terminate() { events.terminated++; } }),
    ...extra,
  });
  return { client, events, answer, engine };
}

test('creating the client downloads nothing; unsupported browser does not load runtime', async () => {
  const { client, events } = fixture({ getNavigator: () => ({}) });
  assert.equal(events.imports, 0);
  assert.equal(await client.enable(), false);
  assert.equal(events.imports, 0);
  assert.equal(client.getSnapshot().status, 'unsupported');
  client.dispose();
});

test('concurrent enable calls load one model; generation rejects overlap', async () => {
  const { client, events, answer } = fixture();
  await Promise.all([client.enable(), client.enable()]);
  assert.equal(events.loads, 1);
  assert.equal(client.getSnapshot().modelId, MODEL_IDS.f16);
  const pending = client.generate({ prompt: 'Explain validity.', maxTokens: 1400 });
  assert.equal(events.lastRequest.max_tokens, 1400, 'structured exercises have room for a complete JSON response');
  await assert.rejects(client.generate({ prompt: 'Another question' }), { name: 'BusyError' });
  answer.resolve({ choices: [{ message: { content: 'A valid argument preserves truth.' } }] });
  assert.match(await pending, /preserves truth/);
  assert.equal(client.getSnapshot().status, 'ready');
  client.dispose();
});

test('stop rejects a pending answer and a late reply cannot restore ready state', async () => {
  const { client, events, answer } = fixture();
  await client.enable();
  const pending = client.generate({ prompt: 'Explain duty.' });
  client.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  answer.resolve({ choices: [{ message: { content: 'A late reply' } }] });
  await Promise.resolve();
  assert.equal(client.getSnapshot().status, 'idle');
  assert.equal(client.getSnapshot().ready, false);
  assert.equal(events.terminated, 1);
  client.dispose();
});

test('generation timeout terminates worker and leaves a recoverable error', async () => {
  const { client, events } = fixture({ generationTimeout: 10 });
  await client.enable();
  await assert.rejects(client.generate({ prompt: 'A question' }), /took too long/);
  assert.equal(client.getSnapshot().status, 'error');
  assert.equal(events.terminated, 1);
  client.dispose();
});

test('a cancelled unload cannot tear down a subsequently enabled engine', async () => {
  const { client, events, engine } = fixture();
  const waiting = deferred();
  engine.unload = () => waiting.promise;
  await client.enable();
  const unloading = client.unload();
  client.stop();
  await client.enable();
  waiting.resolve();
  await unloading;
  assert.equal(events.loads, 2);
  assert.equal(client.getSnapshot().status, 'ready');
  assert.equal(events.terminated, 1);
  client.dispose();
});

test('cancelling model loading ignores late loader completion', async () => {
  const loading = deferred();
  const { client, events } = fixture({ loadRuntime: async () => ({ CreateWebWorkerMLCEngine: () => loading.promise }) });
  const pending = client.enable();
  await new Promise(resolve => setTimeout(resolve, 0));
  client.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  loading.resolve({ interruptGenerate() {} });
  await Promise.resolve();
  assert.equal(client.getSnapshot().ready, false);
  assert.equal(client.getSnapshot().status, 'idle');
  assert.equal(events.terminated, 1);
  client.dispose();
});

test('no f16 feature selects compatible model; cache removal targets only the two model variants', async () => {
  const { client, events } = fixture({ getNavigator: () => ({ gpu: { requestAdapter: async () => ({ features: new Set() }) } }) });
  await client.enable();
  assert.equal(client.getSnapshot().modelId, MODEL_IDS.f32);
  await client.clearCache();
  assert.deepEqual(events.deleted, Object.values(MODEL_IDS));
  assert.equal(client.getSnapshot().status, 'idle');
  client.dispose();
});

test('structured format forwards only type and schema without allowing request-key overrides', async () => {
  const { client, events, answer } = fixture();
  await client.enable();
  const schema = JSON.stringify({ type: 'object', properties: { solution: { type: 'string' } }, required: ['solution'], additionalProperties: false });
  const pending = client.generate({
    system: 'Create a logic exercise.', prompt: 'One example', maxTokens: 1400,
    responseFormat: { type: 'json_object', schema, stream: true, messages: [{ role: 'system', content: 'INJECTED' }], max_tokens: 999999 },
  });
  assert.deepEqual(events.lastRequest.response_format, { type: 'json_object', schema });
  assert.equal(events.lastRequest.stream, false);
  assert.equal(events.lastRequest.max_tokens, 1400);
  assert.equal(events.lastRequest.messages[1].content, 'One example');
  assert.match(events.lastRequest.messages[0].content, /Return ONLY a JSON object/);
  assert.doesNotMatch(JSON.stringify(events.lastRequest), /INJECTED/);
  answer.resolve({ choices: [{ message: { content: '{"solution":"A valid argument."}' } }] });
  assert.equal(await pending, '{"solution":"A valid argument."}');
  client.dispose();
});

test('invalid structured-output schema is rejected before inference without unloading a ready model', async () => {
  const { client, events } = fixture();
  await client.enable();
  await assert.rejects(client.generate({ prompt: 'Example', responseFormat: { type: 'json_object', schema: '{broken' } }), /not valid JSON/);
  await assert.rejects(client.generate({ prompt: 'Example', responseFormat: { type: 'structural_tag' } }), /json_object/);
  assert.equal(events.lastRequest, undefined);
  assert.equal(client.getSnapshot().ready, true);
  client.dispose();
});

test('catalog grounding ranks matches and links only safe catalog routes/files', () => {
  const catalog = [
    { id: 'kant', title: 'Kant: duty', desc: 'Categorical imperative', route: '/revision/kant' },
    { id: 'essay', title: 'Essay Planner', file: 'resources/Essay plan.pdf' },
  ];
  assert.equal(relatedResources('Explain Kant and duty', catalog)[0].id, 'kant');
  assert.equal(resourceTarget(catalog[1], '/eduresources/').href, '/eduresources/resources/Essay%20plan.pdf');
  assert.equal(resourceTarget({ route: '//evil.example' }), null);
  assert.equal(resourceTarget({ file: 'resources/../../secret.pdf' }), null);
  assert.equal(resourceTarget({ file: 'javascript:alert(1)' }), null);
  const context = studyContext('Kant', catalog, [{ resourceId: 'kant', title: 'Kant: Duty', text: 'Duty concerns moral obligation.' }]);
  assert.match(context.system, /Duty concerns moral obligation/);
  assert.match(context.system, /do not produce URLs/i);
});

test('modus tollens retrieves the matching excerpt and its tool link instead of arbitrary first cards', () => {
  const catalog = [
    { id: 'tool-flashcards', title: 'Philosophy Flashcards', route: '/flashcards' },
    { id: 'tool-logic-practice', title: 'Logic Practice', route: '/philosophy-fundamentals/logic-problems' },
  ];
  const excerpts = [
    { resourceId: 'tool-flashcards', title: 'Kant: Duty', text: 'UNRELATED_DUTY' },
    { resourceId: 'tool-flashcards', title: 'Mill: Pleasure', text: 'UNRELATED_PLEASURE' },
    { resourceId: 'tool-flashcards', title: 'Bentham: Utility', text: 'UNRELATED_UTILITY' },
    { resourceId: 'tool-logic-practice', title: 'Modus tollens', text: 'If P then Q; not Q; therefore not P. This form is valid.' },
    { resourceId: 'invalid-catalog-id', title: 'Modus tollens', text: 'UNTRUSTED_ORPHAN' },
  ];
  const context = studyContext('What is modus tollens?', catalog, excerpts);
  assert.match(context.system, /If P then Q; not Q; therefore not P/);
  assert.doesNotMatch(context.system, /UNRELATED_|UNTRUSTED_ORPHAN|Teacher-reviewed/i);
  assert.deepEqual(context.resources.map(resource => resource.id), ['tool-logic-practice']);
  assert.equal(resourceTarget(context.resources[0]).href, '/philosophy-fundamentals/logic-problems');
  assert.match(context.system, /correct site tool is exactly "Logic Practice"/);
  assert.match(context.system, /Source tool: Logic Practice/);
});

test('excerpt retrieval prioritizes title matches and limits references to three 700-character excerpts', () => {
  const catalog = [{ id: 'tool', title: 'Study tool', route: '/study' }];
  const excerpts = [
    { resourceId: 'tool', title: 'General philosophy', text: `A passing mention of modus tollens. ${'a'.repeat(2000)}` },
    { resourceId: 'tool', title: 'Modus tollens', text: `BEST_MATCH ${'b'.repeat(2000)}` },
    { resourceId: 'tool', title: 'Modus tollens application', text: 'c'.repeat(2000) },
    { resourceId: 'tool', title: 'Modus tollens counterexample', text: 'd'.repeat(2000) },
  ];
  const context = studyContext('modus tollens', catalog, excerpts);
  const supplied = context.system.split('Reviewed study excerpts:\n')[1];
  assert.ok(supplied.startsWith('Source tool: Study tool\nModus tollens\nBEST_MATCH'));
  assert.doesNotMatch(supplied, /passing mention/);
  assert.ok(supplied.length <= 2104);
});
