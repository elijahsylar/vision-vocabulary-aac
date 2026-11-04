import test from 'node:test';
import assert from 'node:assert/strict';
import ImprovedVisionSystem from '../src/core/ImprovedVisionSystem.js';

// getStableDetections() only reads detectionHistory: no model is loaded.
const stable = (frames, stabilityFrames = 3) => {
  const v = new ImprovedVisionSystem({ stabilityFrames });
  for (const f of frames) v.updateDetectionHistory(f.map((c) => ({ class: c, score: 0.9 })));
  return v.getStableDetections().map((d) => d.class).sort();
};

test('a class seen in most frames is stable', () => {
  assert.deepEqual(stable([['cup'], ['cup'], []]), ['cup']);
});

test('a one-frame flicker is not stable (60% of 3 frames is 2)', () => {
  assert.deepEqual(stable([['cup'], [], []]), []);
});

test('two of the same object in one frame count as one frame', () => {
  assert.deepEqual(stable([['cup', 'cup'], [], []]), []);
});
