import test from 'node:test';
import assert from 'node:assert/strict';
import { rotatedRect90, scaleRectFromCenter } from '../.build/js/drawing/transform.js';

test('90 degree transform swaps selection dimensions around the same center', () => {
  assert.deepEqual(rotatedRect90({ x: 10, y: 20, width: 40, height: 20 }), { x: 20, y: 10, width: 20, height: 40 });
});

test('scaleRectFromCenter preserves center', () => {
  assert.deepEqual(scaleRectFromCenter({ x: 10, y: 10, width: 20, height: 10 }, 2), { x: 0, y: 5, width: 40, height: 20 });
});
