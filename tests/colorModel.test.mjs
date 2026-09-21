import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  generateHarmony,
  generateColorVariants
} from '../.build/js/drawing/colorModel.js';

test('color model round-trips HEX RGB and HSV', () => {
  assert.deepEqual(hexToRgb('#336699'), { r: 51, g: 102, b: 153 });
  assert.equal(rgbToHex({ r: 51, g: 102, b: 153 }), '#336699');
  const hsv = rgbToHsv({ r: 51, g: 102, b: 153 });
  assert.ok(Math.abs(hsv.h - 210) < 0.01);
  assert.ok(Math.abs(hsv.s - 2 / 3) < 0.01);
  assert.ok(Math.abs(hsv.v - 0.6) < 0.01);
  assert.deepEqual(hsvToRgb(hsv), { r: 51, g: 102, b: 153 });
});

test('harmony generator creates deterministic complementary and triadic palettes', () => {
  const complementary = generateHarmony('#FF0000', 'complementary');
  assert.equal(complementary.length, 5);
  assert.ok(complementary.includes('#00FFFF'));
  const triadic = generateHarmony('#FF0000', 'triadic');
  assert.ok(triadic.includes('#00FF00'));
  assert.ok(triadic.includes('#0000FF'));
});

test('color variants include tint shade tone warm and cool transformations', () => {
  const variants = generateColorVariants('#6699CC');
  assert.equal(variants.tint.length, 5);
  assert.equal(variants.shade.length, 5);
  assert.equal(variants.tone.length, 5);
  assert.notEqual(variants.warm[2], variants.cool[2]);
});
