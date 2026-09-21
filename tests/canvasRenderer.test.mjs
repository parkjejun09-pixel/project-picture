import test from 'node:test';
import assert from 'node:assert/strict';
import { getDabStyle } from '../.build/js/drawing/canvasRenderer.js';

test('getDabStyle describes a brush dab from editor settings', () => {
  assert.deepEqual(getDabStyle('brush', '#336699', 0.4, 20), {
    compositeOperation: 'source-over',
    fillStyle: '#336699',
    globalAlpha: 0.4,
    radius: 10
  });
});

test('getDabStyle uses destination-out for eraser', () => {
  const style = getDabStyle('eraser', '#FFFFFF', 0.75, 12);
  assert.equal(style.compositeOperation, 'destination-out');
  assert.equal(style.globalAlpha, 0.75);
  assert.equal(style.radius, 6);
});
