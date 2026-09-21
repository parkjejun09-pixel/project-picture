import test from 'node:test';
import assert from 'node:assert/strict';
import {
  snapToGrid,
  snapToGuide,
  projectPointToLine,
  nearestPointOnCubic,
  snapToRadial,
  snapToConcentric,
  buildSymmetryPoints
} from '../.build/js/drawing/assist.js';

const roundPoint = (p) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });

test('V0.6.6 grid and guide snapping constrain pointer coordinates', () => {
  assert.deepEqual(snapToGrid({ x: 23, y: 38 }, 16), { x: 16, y: 32 });
  assert.deepEqual(snapToGrid({ x: 25, y: 41 }, 16, 4, 4), { x: 20, y: 36 });
  assert.deepEqual(snapToGuide({ x: 73, y: 52 }, 'vertical', 40), { x: 40, y: 52 });
  assert.deepEqual(snapToGuide({ x: 73, y: 52 }, 'horizontal', 19), { x: 73, y: 19 });
});

test('V0.6.6 straight and parallel rulers project onto an angled line through the stroke origin', () => {
  const projected = projectPointToLine({ x: 30, y: 22 }, { x: 10, y: 10 }, 0);
  assert.deepEqual(roundPoint(projected), { x: 30, y: 10 });
  const diagonal = projectPointToLine({ x: 20, y: 0 }, { x: 0, y: 0 }, 45);
  assert.deepEqual(roundPoint(diagonal), { x: 10, y: 10 });
});

test('V0.6.6 curve ruler finds a nearby point on a cubic bezier', () => {
  const nearest = nearestPointOnCubic(
    { x: 52, y: 42 },
    { x: 0, y: 0 },
    { x: 35, y: 70 },
    { x: 65, y: 70 },
    { x: 100, y: 0 },
    160
  );
  assert.ok(nearest.x > 44 && nearest.x < 60);
  assert.ok(nearest.y > 50 && nearest.y < 55);
});

test('V0.6.6 radial and concentric rulers snap around a center', () => {
  assert.deepEqual(roundPoint(snapToRadial({ x: 18, y: 7 }, { x: 10, y: 10 }, 4)), { x: 18.544, y: 10 });
  assert.deepEqual(roundPoint(snapToConcentric({ x: 24, y: 10 }, { x: 10, y: 10 }, 10)), { x: 20, y: 10 });
});

test('V0.6.6 symmetry generates rotated copies around a center for 2 to 12 axes', () => {
  assert.deepEqual(buildSymmetryPoints({ x: 14, y: 10 }, { x: 10, y: 10 }, 2).map(roundPoint), [
    { x: 14, y: 10 },
    { x: 6, y: 10 }
  ]);
  const four = buildSymmetryPoints({ x: 14, y: 10 }, { x: 10, y: 10 }, 4).map(roundPoint);
  assert.deepEqual(four, [
    { x: 14, y: 10 },
    { x: 10, y: 14 },
    { x: 6, y: 10 },
    { x: 10, y: 6 }
  ]);
  assert.equal(buildSymmetryPoints({ x: 20, y: 10 }, { x: 10, y: 10 }, 99).length, 12);
});
