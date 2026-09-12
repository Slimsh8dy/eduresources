import test from 'node:test';
import assert from 'node:assert/strict';
import {RATING_KEY, loadRatings, saveRatings} from '../app/src/ratings.mjs';

const resources = [
  {id: 'kant', file: 'resources/Kant-Main-Concepts.pdf'},
  {id: 'util', file: 'resources/Utilitarianism.pdf'},
  {id: 'audio', file: 'resources/Bentham-intro.wav'},
  {id: 'podcast', url: 'https://podcasts.apple.com/gb/podcast/in-our-time/id73330895?i=1000344513660'},
];
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {data, get length() {return data.size;}, key: index => Array.from(data.keys())[index] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key)};
}
const encoded = values => JSON.stringify({version: 1, values});

test('loading ratings preserves modern values and every existing storage key', () => {
  const initial = {[RATING_KEY]: encoded({kant: 4.5, util: 0}), theme: 'dark'};
  const storage = memoryStorage(initial);
  assert.deepEqual(loadRatings(resources, storage).values, {kant: 4.5, util: 0});
  assert.deepEqual(Object.fromEntries(storage.data), initial);
});

test('legacy PDF, audio and podcast ratings merge by asset identity despite title differences', () => {
  const storage = memoryStorage({
    'rating_Kant (old search title)_resources/Kant-Main-Concepts.pdf': '3.5',
    'rating_Utilitarianism — Revision Notes_resources/Utilitarianism.pdf': '4',
    'rating_Bentham — Intro (Audio)_resources/Bentham-intro.wav': '2.5',
    ['rating_Old podcast title_' + resources[3].url]: '5',
    'rating_Unknown title_resources/Unknown.pdf': '5',
  });
  const before = new Map(storage.data);
  const result = loadRatings(resources, storage);
  assert.deepEqual(result.values, {kant: 3.5, util: 4, audio: 2.5, podcast: 5});
  assert.equal(result.available, true);
  assert.deepEqual(storage.data, before);
});

test('modern values including Not rated zero take precedence over conflicting legacy values', () => {
  const storage = memoryStorage({[RATING_KEY]: encoded({kant: 0, util: 2}), 'rating_Old Kant_resources/Kant-Main-Concepts.pdf': '5', 'rating_Old Util_resources/Utilitarianism.pdf': '4.5', 'rating_Audio_resources/Bentham-intro.wav': '3'});
  assert.deepEqual(loadRatings(resources, storage).values, {kant: 0, util: 2, audio: 3});
});

test('invalid, blank, out-of-range and non-half-star ratings are ignored', () => {
  const storage = memoryStorage({[RATING_KEY]: encoded({kant: '4.5', util: 6, audio: 2.2, unrelated: 5}), 'rating_Kant_resources/Kant-Main-Concepts.pdf': ' ', 'rating_Util_resources/Utilitarianism.pdf': 'NaN', 'rating_Audio_resources/Bentham-intro.wav': '-1', ['rating_Podcast_' + resources[3].url]: '5.5'});
  assert.deepEqual(loadRatings(resources, storage).values, {});
});

test('corrupt modern data is retained while valid legacy ratings still display', () => {
  for (const raw of ['{broken', '', 'null', '[]', '{"version":1,"values":null}', '{"version":1,"values":[]}']) {
    const storage = memoryStorage({[RATING_KEY]: raw, 'rating_Kant_resources/Kant-Main-Concepts.pdf': '4.5'});
    const result = loadRatings(resources, storage);
    assert.deepEqual(result.values, {kant: 4.5});
    assert.equal(result.available, false);
    assert.equal(result.recoveryBlocked, true);
    assert.ok(result.message);
    assert.equal(storage.getItem(RATING_KEY), raw);
    assert.equal(saveRatings({kant: 3}, storage), false);
    assert.equal(storage.getItem(RATING_KEY), raw);
  }
});

test('future ratings schemas cannot be downgraded by loading or normal rating changes', () => {
  const raw = JSON.stringify({version: 2, values: {kant: 5}, futureField: 'keep me'});
  const storage = memoryStorage({[RATING_KEY]: raw});
  assert.equal(loadRatings(resources, storage).recoveryBlocked, true);
  assert.equal(saveRatings({kant: 1}, storage), false);
  assert.equal(storage.getItem(RATING_KEY), raw);
});

test('explicit recovery can replace unreadable data while retaining legacy entries', () => {
  const storage = memoryStorage({[RATING_KEY]: '{broken', 'rating_Kant_resources/Kant-Main-Concepts.pdf': '4'});
  assert.equal(saveRatings({kant: 2.5}, storage, {replaceUnreadable: true}), true);
  const result = loadRatings(resources, storage);
  assert.deepEqual(result.values, {kant: 2.5});
  assert.equal(result.recoveryBlocked, false);
  assert.equal(result.available, true);
  assert.equal(storage.getItem('rating_Kant_resources/Kant-Main-Concepts.pdf'), '4');
});

test('blocked storage does not throw or discard ratings already read', () => {
  const denied = {getItem() {throw new Error('blocked');}, setItem() {throw new Error('blocked');}};
  assert.equal(loadRatings(resources, denied).available, false);
  assert.equal(saveRatings({kant: 2}, denied), false);
  const storage = memoryStorage({[RATING_KEY]: encoded({kant: 4.5})});
  storage.setItem = () => {throw new Error('quota exceeded');};
  const result = loadRatings(resources, storage);
  assert.deepEqual(result.values, {kant: 4.5});
  assert.equal(result.available, false);
  assert.equal(saveRatings({kant: 3}, storage), false);
  assert.deepEqual(JSON.parse(storage.getItem(RATING_KEY)).values, {kant: 4.5});
});

test('legacy enumeration errors cannot erase successfully loaded modern ratings', () => {
  const storage = memoryStorage({[RATING_KEY]: encoded({kant: 4})});
  storage.key = () => {throw new Error('cannot enumerate');};
  const result = loadRatings(resources, storage);
  assert.deepEqual(result.values, {kant: 4});
  assert.ok(result.message);
});

test('ordinary saving round-trips half-star values and rejects invalid data', () => {
  const storage = memoryStorage();
  for (let value = 0; value <= 5; value += .5) {
    assert.equal(saveRatings({kant: value}, storage), true);
    assert.equal(loadRatings(resources, storage).values.kant, value);
  }
  const before = storage.getItem(RATING_KEY);
  for (const values of [null, [], {kant: Infinity}, {kant: 1.25}, {kant: '3'}, {kant: -1}]) assert.equal(saveRatings(values, storage), false);
  assert.equal(storage.getItem(RATING_KEY), before);
});
