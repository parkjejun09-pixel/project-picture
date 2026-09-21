import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePixelHex } from '../.build/js/drawing/eyedropper.js';

test('eyedropper samples opaque composite pixels as normalized HEX', () => {
  const buffer = { width: 2, height: 1, data: new Uint8ClampedArray([51,34,51,255, 18,52,86,255]) };
  assert.equal(samplePixelHex(buffer, 0, 0), '#332233');
  assert.equal(samplePixelHex(buffer, 1, 0), '#123456');
});

test('eyedropper clamps sample coordinates to the image', () => {
  const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([255,128,0,255]) };
  assert.equal(samplePixelHex(buffer, 99, -20), '#FF8000');
});
