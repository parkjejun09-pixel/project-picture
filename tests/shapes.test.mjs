import test from 'node:test';
import assert from 'node:assert/strict';
import { shapeBounds, lineEndpoints } from '../.build/js/drawing/shapes.js';

test('shape bounds normalize reverse drags', () => {
  assert.deepEqual(shapeBounds({x:20,y:30},{x:5,y:10}), {x:5,y:10,width:15,height:20});
});

test('line endpoints preserve the original drag direction', () => {
  assert.deepEqual(lineEndpoints({x:20,y:30},{x:5,y:10}), {x1:20,y1:30,x2:5,y2:10});
});
