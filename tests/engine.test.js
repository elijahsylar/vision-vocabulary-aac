import test from 'node:test';
import assert from 'node:assert/strict';
import SimpleAACEngine from '../src/core/SimpleAACEngine.js';
import AACEngine from '../src/core/AACEngine.js';

test('detections become symbol buttons, unknown classes fall back to ?', () => {
  const e = new SimpleAACEngine();
  const v = e.processDetections([{ class: 'cup', score: 0.9 }, { class: 'not-a-coco-class', score: 0.4 }]);
  assert.equal(v.length, 2);
  assert.deepEqual(v.map((x) => x.word), ['cup', 'not-a-coco-class']);
  assert.ok(v.every((x) => x.isDetected && x.category === 'object'));
  assert.notEqual(v[0].symbol, '❓');
  assert.equal(v[1].symbol, '❓');
  assert.equal(v[0].confidence, 0.9);
});

test('core words come back sorted by priority and flagged as core', () => {
  const words = new SimpleAACEngine().getCommonWords();
  assert.ok(words.length > 0);
  assert.ok(words.every((w) => w.isCore));
  for (let i = 1; i < words.length; i++) assert.ok(words[i - 1].priority >= words[i].priority);
});

test('core words can be switched off', () => {
  const e = new SimpleAACEngine({ includeCommonWords: false });
  assert.deepEqual(e.getCommonWords(), []);
});

test('getAllVocabulary keeps detected and core words apart', () => {
  const all = new SimpleAACEngine().getAllVocabulary([{ class: 'dog', score: 0.8 }]);
  assert.deepEqual(all.detected.map((x) => x.word), ['dog']);
  assert.ok(all.common.length > 0);
});

test('sentences join the selected words', () => {
  assert.equal(new SimpleAACEngine().buildSentence(['I', 'want', 'cup']), 'I want cup');
});

test('symbols resolve for objects and core words; custom words can be added', () => {
  const e = new SimpleAACEngine();
  assert.notEqual(e.getSymbol('dog'), '❓');
  assert.notEqual(e.getSymbol('want'), '❓');
  e.addCustomWord('swing', '🛝');
  assert.equal(e.getSymbol('swing'), '🛝');
});

test('the phrase engine turns a detected object into request and comment phrases', () => {
  const [item] = new AACEngine().processDetections([{ class: 'cup', score: 0.9 }]);
  assert.equal(item.object, 'cup');
  assert.ok(item.phrases.length > 0);
  assert.ok(item.phrases.every((p) => p.text.includes('cup')));
  assert.ok(item.phrases.some((p) => p.intent === 'request'));
});
