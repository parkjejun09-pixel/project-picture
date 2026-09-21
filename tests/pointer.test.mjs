import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePointerDynamics } from '../.build/js/drawing/pointer.js';

test('pen pointer preserves pressure and tilt within safe ranges', () => {
  assert.deepEqual(normalizePointerDynamics('pen', 0.42, 35, -20), {
    pressure: 0.42,
    tiltX: 35,
    tiltY: -20
  });
});

test('mouse and touch pointers draw at full pressure without stylus tilt', () => {
  assert.deepEqual(normalizePointerDynamics('mouse', 0.5, 30, 20), {
    pressure: 1,
    tiltX: 0,
    tiltY: 0
  });
  assert.deepEqual(normalizePointerDynamics('touch', 0, 0, 0), {
    pressure: 1,
    tiltX: 0,
    tiltY: 0
  });
});
