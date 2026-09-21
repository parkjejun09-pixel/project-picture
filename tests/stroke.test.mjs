import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleSegment } from '../.build/js/drawing/stroke.js';

test('sampleSegment includes the endpoint and respects maximum spacing', () => {
  const points = sampleSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 3);
  assert.deepEqual(points.at(-1), { x: 10, y: 0 });
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) <= 3.000001);
  }
});

test('sampleSegment returns one point for zero-length movement', () => {
  assert.deepEqual(sampleSegment({ x: 2, y: 4 }, { x: 2, y: 4 }, 5), [{ x: 2, y: 4 }]);
});

test('sampleStrokeSegment interpolates pressure and tilt with coordinates', async () => {
  const { sampleStrokeSegment } = await import('../.build/js/drawing/stroke.js');
  const points = sampleStrokeSegment(
    { x: 0, y: 0, pressure: 0.2, tiltX: 0, tiltY: 0 },
    { x: 10, y: 0, pressure: 0.8, tiltX: 40, tiltY: -20 },
    5
  );
  assert.equal(points.length, 2);
  assert.equal(points[0].x, 5);
  assert.equal(points[0].pressure, 0.5);
  assert.equal(points[1].pressure, 0.8);
  assert.equal(points[1].tiltX, 40);
  assert.equal(points[1].tiltY, -20);
});
