import test from 'node:test';
import assert from 'node:assert/strict';
import { createVectorStroke, appendVectorPoint, findNearestStroke, updateVectorStroke } from '../.build/js/drawing/vector.js';

test('vector stroke keeps editable path and appearance data', () => {
  let stroke = createVectorStroke('stroke-1', { x: 10, y: 20 }, '#336699', 8, 0.75);
  stroke = appendVectorPoint(stroke, { x: 30, y: 40 });
  assert.equal(stroke.id, 'stroke-1');
  assert.equal(stroke.points.length, 2);
  assert.equal(stroke.color, '#336699');
  assert.equal(stroke.size, 8);
  assert.equal(stroke.opacity, 0.75);
});

test('nearest vector stroke can be selected by distance', () => {
  const a = appendVectorPoint(createVectorStroke('a', { x: 0, y: 0 }, '#000000', 4, 1), { x: 100, y: 0 });
  const b = appendVectorPoint(createVectorStroke('b', { x: 0, y: 50 }, '#000000', 4, 1), { x: 100, y: 50 });
  assert.equal(findNearestStroke([a, b], { x: 40, y: 47 }, 8)?.id, 'b');
  assert.equal(findNearestStroke([a, b], { x: 40, y: 25 }, 8), null);
});

test('vector stroke appearance is editable without changing path', () => {
  const stroke = appendVectorPoint(createVectorStroke('a', { x: 0, y: 0 }, '#000000', 4, 1), { x: 10, y: 10 });
  const next = updateVectorStroke(stroke, { color: '#ff0000', size: 12 });
  assert.deepEqual(next.points, stroke.points);
  assert.equal(next.color, '#FF0000');
  assert.equal(next.size, 12);
});

test('vector control points can be edited after drawing', async () => {
  const { updateVectorPoint, findNearestPointIndex } = await import('../.build/js/drawing/vector.js');
  let stroke = appendVectorPoint(createVectorStroke('c', { x: 0, y: 0 }, '#000000', 4, 1), { x: 20, y: 20 });
  assert.equal(findNearestPointIndex(stroke, { x: 18, y: 21 }, 5), 1);
  stroke = updateVectorPoint(stroke, 1, { x: 40, y: 30 });
  assert.deepEqual(stroke.points[1], { x: 40, y: 30 });
});
