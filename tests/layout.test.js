import test from 'node:test';
import assert from 'node:assert/strict';
import SimpleAACEngine from '../src/core/SimpleAACEngine.js';
import LayoutManager from '../src/core/LayoutManager.js';

const engine = new SimpleAACEngine();
const detect = (...classes) => engine.processDetections(classes.map((c) => ({ class: c, score: 0.9 })));

test('every zone fits inside the grid', () => {
  for (const rows of [2, 3, 4, 6]) {
    const l = new LayoutManager({ gridRows: rows });
    for (const z of Object.values(l.zones)) {
      assert.ok(z.startRow >= 0 && z.endRow < rows && z.startRow <= z.endRow, `rows=${rows} ${JSON.stringify(z)}`);
    }
  }
});

test('core words fill the top rows and detected objects are placed below them', () => {
  const l = new LayoutManager();
  const r = l.layoutVocabulary([...engine.getCommonWords(), ...detect('cup', 'dog')]);
  const core = l.zones.core;
  for (const w of engine.getCommonWords().slice(0, 6)) {
    const p = r.positions.get(w.word);
    assert.ok(p && p.row >= core.startRow && p.row <= core.endRow, w.word);
  }
  for (const word of ['cup', 'dog']) {
    const p = r.positions.get(word);
    assert.ok(p && p.row > core.endRow, word);
  }
});

test('no cell is used twice', () => {
  const l = new LayoutManager();
  const r = l.layoutVocabulary([...engine.getCommonWords(), ...detect('cup', 'dog', 'chair')]);
  const cells = [...r.positions.values()].map((p) => `${p.row},${p.col}`);
  assert.equal(new Set(cells).size, cells.length);
});

test('core words keep their cell when the detected objects change (motor memory)', () => {
  const l = new LayoutManager();
  const first = l.layoutVocabulary([...engine.getCommonWords(), ...detect('cup')]);
  const second = l.layoutVocabulary([...engine.getCommonWords(), ...detect('dog', 'chair')]);
  for (const w of engine.getCommonWords().slice(0, 12)) {
    assert.deepEqual(second.positions.get(w.word), first.positions.get(w.word), w.word);
  }
});

test('metrics count filled cells', () => {
  const l = new LayoutManager();
  l.layoutVocabulary(detect('cup', 'dog'));
  const m = l.getLayoutMetrics();
  assert.equal(m.totalPositions, 24);
  assert.equal(m.filled, 2);
  assert.equal(m.filled + m.empty, m.totalPositions);
});

test('updateConfig to a smaller grid rebuilds the zones', () => {
  const l = new LayoutManager();
  l.updateConfig({ gridRows: 2 });
  for (const z of Object.values(l.zones)) assert.ok(z.endRow < 2, JSON.stringify(l.zones));
  const r = l.layoutVocabulary(detect('cup'));
  assert.ok(r.positions.has('cup'), 'the detected word still gets a cell');
});

test('importData from a larger grid lays out without errors', () => {
  const saved = JSON.parse(JSON.stringify(new LayoutManager({ gridRows: 6 }).exportData()));
  const l = new LayoutManager();
  l.importData(saved);
  assert.equal(l.gridState.length, 6);
  assert.doesNotThrow(() => l.layoutVocabulary(detect('cup')));
});
