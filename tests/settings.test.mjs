import test from 'node:test';
import assert from 'node:assert/strict';
import { clampBrushSize, clampOpacity, clampSpacing, clampZoom } from '../.build/js/drawing/settings.js';

test('brush settings clamp to documented V0.1 ranges', () => {
  assert.equal(clampBrushSize(0), 1);
  assert.equal(clampBrushSize(999), 200);
  assert.equal(clampOpacity(-1), 0.01);
  assert.equal(clampOpacity(2), 1);
  assert.equal(clampSpacing(0), 1);
  assert.equal(clampSpacing(99), 40);
  assert.equal(clampZoom(0.1), 0.25);
  assert.equal(clampZoom(9), 4);
});
