import test from 'node:test';
import assert from 'node:assert/strict';
import { stabilizeSample } from '../.build/js/drawing/stabilizer.js';

const previous = { x: 0, y: 0, pressure: 0.2, tiltX: 0, tiltY: 0 };
const current = { x: 100, y: 60, pressure: 0.8, tiltX: 40, tiltY: -20 };

test('stabilizeSample returns raw coordinates when stabilizer is zero', () => {
  assert.deepEqual(stabilizeSample(previous, current, 0), current);
});

test('stabilizeSample damps position while preserving current stylus dynamics', () => {
  const result = stabilizeSample(previous, current, 100);
  assert.ok(result.x > 0 && result.x < 30);
  assert.ok(result.y > 0 && result.y < 20);
  assert.equal(result.pressure, current.pressure);
  assert.equal(result.tiltX, current.tiltX);
  assert.equal(result.tiltY, current.tiltY);
});
