import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rectToQuad,
  quadBounds,
  translateQuad,
  rotateQuad,
  scaleQuadFromHandle,
  updateDistortCorner,
  updatePerspectiveCorner,
  createMeshGrid,
  moveMeshPoint,
  meshBounds,
  affineFromTriangles
} from '../.build/js/drawing/transform.js';

const roundPoint = (p) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });

test('free transform quad can translate scale and rotate around its center', () => {
  const q = rectToQuad({ x: 10, y: 20, width: 40, height: 20 });
  assert.deepEqual(quadBounds(translateQuad(q, 5, -5)), { x: 15, y: 15, width: 40, height: 20 });
  const scaled = scaleQuadFromHandle(q, 'se', { x: 70, y: 50 }, false);
  assert.deepEqual(quadBounds(scaled), { x: 10, y: 20, width: 60, height: 30 });
  const rotated = rotateQuad(q, Math.PI / 2);
  assert.deepEqual(roundPoint(rotated.tl), { x: 40, y: 10 });
  assert.deepEqual(roundPoint(rotated.br), { x: 20, y: 50 });
});

test('distort and perspective move real quad corners', () => {
  const q = rectToQuad({ x: 0, y: 0, width: 100, height: 80 });
  const distorted = updateDistortCorner(q, 'tl', { x: 20, y: 10 });
  assert.deepEqual(distorted.tl, { x: 20, y: 10 });
  assert.deepEqual(distorted.br, { x: 100, y: 80 });
  const perspective = updatePerspectiveCorner(q, 'tl', { x: 15, y: 12 });
  assert.deepEqual(perspective.tl, { x: 15, y: 12 });
  assert.equal(perspective.tr.y, 12);
  assert.deepEqual(perspective.bl, { x: 0, y: 80 });
});

test('mesh transform exposes independently movable control points and bounds', () => {
  const mesh = createMeshGrid({ x: 10, y: 20, width: 90, height: 60 }, 3, 3);
  assert.equal(mesh.points.length, 9);
  const moved = moveMeshPoint(mesh, 4, { x: 70, y: 70 });
  assert.deepEqual(moved.points[4], { x: 70, y: 70 });
  assert.deepEqual(meshBounds(moved), { x: 10, y: 20, width: 90, height: 60 });
});

test('affine transform maps one triangle onto another', () => {
  const matrix = affineFromTriangles(
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }],
    [{ x: 5, y: 7 }, { x: 25, y: 7 }, { x: 5, y: 37 }]
  );
  assert.deepEqual(Object.fromEntries(Object.entries(matrix).map(([k,v]) => [k, Math.round(v * 1000) / 1000])), { a: 2, b: 0, c: 0, d: 3, e: 5, f: 7 });
});
