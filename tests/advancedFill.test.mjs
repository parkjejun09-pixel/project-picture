import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnpaintedMask, intersectMasks } from '../.build/js/drawing/advancedFill.js';

test('unpainted fill selects a connected transparent region only', () => {
  const data = new Uint8ClampedArray([
    0,0,0,0, 0,0,0,0, 20,20,20,255,
    0,0,0,0, 0,0,0,255, 20,20,20,255,
  ]);
  const mask = createUnpaintedMask({width:3,height:2,data},0,0,16);
  assert.deepEqual([...mask],[1,1,0,1,0,0]);
});

test('mask intersection is suitable for enclose-and-fill selection constraints', () => {
  assert.deepEqual([...intersectMasks(new Uint8Array([1,1,0,1]), new Uint8Array([1,0,1,1]))],[1,0,0,1]);
});
