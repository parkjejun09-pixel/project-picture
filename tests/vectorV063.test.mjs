import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVectorStroke,
  appendVectorPoint,
  insertVectorPoint,
  deleteVectorPoint,
  setVectorHandle,
  nearestVectorSegmentIndex,
  eraseVectorSegment,
  simplifyVectorStroke,
  connectVectorStrokes,
  redrawVectorSegment
} from '../.build/js/drawing/vector.js';

test('vector anchors can be inserted deleted and given bezier handles', () => {
  let stroke = appendVectorPoint(createVectorStroke('s', { x: 0, y: 0 }, '#000', 4, 1), { x: 20, y: 0 });
  stroke = insertVectorPoint(stroke, 0, { x: 10, y: 5 });
  assert.deepEqual(stroke.points.map(({x,y}) => ({x,y})), [{x:0,y:0},{x:10,y:5},{x:20,y:0}]);
  stroke = setVectorHandle(stroke, 1, 'out', { x: 16, y: 12 });
  assert.deepEqual(stroke.points[1].outHandle, { x: 16, y: 12 });
  stroke = deleteVectorPoint(stroke, 1);
  assert.equal(stroke.points.length, 2);
});

test('partial vector eraser removes the nearest segment by splitting the path', () => {
  let stroke = createVectorStroke('s', { x: 0, y: 0 }, '#000', 4, 1);
  for (const x of [10,20,30,40]) stroke = appendVectorPoint(stroke, { x, y: 0 });
  assert.equal(nearestVectorSegmentIndex(stroke, { x: 24, y: 2 }, 5), 2);
  const pieces = eraseVectorSegment(stroke, { x: 24, y: 2 }, 5);
  assert.equal(pieces.length, 2);
  assert.deepEqual(pieces[0].points.map(p => p.x), [0,10,20]);
  assert.deepEqual(pieces[1].points.map(p => p.x), [30,40]);
});

test('simplify vector stroke reduces redundant points while preserving endpoints', () => {
  let stroke = createVectorStroke('s', { x: 0, y: 0 }, '#000', 4, 1);
  for (let x = 1; x <= 20; x += 1) stroke = appendVectorPoint(stroke, { x, y: x % 2 ? 0.1 : -0.1 });
  const simple = simplifyVectorStroke(stroke, 0.5);
  assert.ok(simple.points.length < stroke.points.length);
  assert.deepEqual(simple.points[0], stroke.points[0]);
  assert.deepEqual(simple.points.at(-1), stroke.points.at(-1));
});

test('vector strokes can connect at their nearest endpoints and redraw a segment', () => {
  let a = appendVectorPoint(createVectorStroke('a', { x: 0, y: 0 }, '#123456', 4, 1), { x: 10, y: 0 });
  let b = appendVectorPoint(createVectorStroke('b', { x: 20, y: 0 }, '#654321', 5, 0.8), { x: 11, y: 0 });
  const joined = connectVectorStrokes(a, b, 'joined');
  assert.equal(joined.id, 'joined');
  assert.deepEqual(joined.points.map(p => p.x), [0,10,11,20]);
  const redrawn = redrawVectorSegment(joined, 1, 2, [{ x: 10, y: 0 }, { x: 10.5, y: 8 }, { x: 11, y: 0 }]);
  assert.deepEqual(redrawn.points.map(p => p.y), [0,0,8,0,0]);
});
