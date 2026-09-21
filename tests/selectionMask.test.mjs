import test from 'node:test';
import assert from 'node:assert/strict';
import { createLassoMask, createMagicWandMask, maskBounds } from '../.build/js/drawing/selectionMask.js';

test('lasso mask rasterizes a polygon and reports its occupied bounds', () => {
  const mask = createLassoMask(6,6,[{x:1,y:1},{x:4,y:1},{x:1,y:4}]);
  assert.equal(mask[2*6+2], 1);
  assert.equal(mask[5*6+5], 0);
  assert.deepEqual(maskBounds(mask,6,6), {x:1,y:1,width:3,height:3});
});

test('magic wand selects only the connected tolerance region', () => {
  const data = new Uint8ClampedArray([
    10,10,10,255, 10,10,10,255, 240,240,240,255,
    10,10,10,255, 12,12,12,255, 240,240,240,255,
  ]);
  const mask = createMagicWandMask({width:3,height:2,data},0,0,8);
  assert.equal(mask[0],1); assert.equal(mask[1],1); assert.equal(mask[3],1); assert.equal(mask[4],1);
  assert.equal(mask[2],0); assert.equal(mask[5],0);
});
