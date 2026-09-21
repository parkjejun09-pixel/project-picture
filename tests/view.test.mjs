import test from 'node:test';
import assert from 'node:assert/strict';
import { buildViewTransform, zoomFromWheel } from '../.build/js/drawing/view.js';

test('buildViewTransform keeps pan in screen pixels and applies zoom', () => {
  assert.equal(buildViewTransform({ x: 24, y: -12 }, 1.5), 'translate3d(24px, -12px, 0) scale(1.5)');
});

test('zoomFromWheel zooms in/out and respects limits', () => {
  assert.ok(zoomFromWheel(1, -120) > 1);
  assert.ok(zoomFromWheel(1, 120) < 1);
  assert.equal(zoomFromWheel(4, -10000), 4);
  assert.equal(zoomFromWheel(0.25, 10000), 0.25);
});
