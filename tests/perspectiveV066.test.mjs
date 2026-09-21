import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultPerspective,
  nearestPerspectiveRay,
  projectToPerspective
} from '../.build/js/drawing/perspective.js';

const round = (p) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });

test('V0.6.6 perspective defaults expose one two and three vanishing points on normalized layouts', () => {
  const one = buildDefaultPerspective('one');
  const two = buildDefaultPerspective('two');
  const three = buildDefaultPerspective('three');
  assert.equal(one.vanishingPoints.length, 1);
  assert.equal(two.vanishingPoints.length, 2);
  assert.equal(three.vanishingPoints.length, 3);
  assert.equal(one.horizonY, 0.5);
  assert.ok(two.vanishingPoints[0].x < 0.5 && two.vanishingPoints[1].x > 0.5);
  assert.ok(three.vanishingPoints[2].y < three.horizonY);
});

test('V0.6.6 one-point perspective projects onto the ray toward the vanishing point', () => {
  const projected = projectToPerspective(
    { x: 60, y: 40 },
    { x: 50, y: 80 },
    [{ x: 50, y: 20 }]
  );
  assert.deepEqual(round(projected), { x: 50, y: 40 });
});

test('V0.6.6 perspective chooses the vanishing ray closest to pointer direction', () => {
  const origin = { x: 50, y: 70 };
  const vps = [{ x: 0, y: 30 }, { x: 100, y: 30 }];
  const left = nearestPerspectiveRay({ x: 15, y: 40 }, origin, vps);
  const right = nearestPerspectiveRay({ x: 84, y: 40 }, origin, vps);
  assert.equal(left.index, 0);
  assert.equal(right.index, 1);
  assert.ok(left.angleError < Math.PI / 8);
  assert.ok(right.angleError < Math.PI / 8);
});
