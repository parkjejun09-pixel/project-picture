import test from 'node:test';
import assert from 'node:assert/strict';
import { taperEnvelope, textureSample } from '../.build/js/drawing/advancedBrush.js';
import { buildBrushPreviewModel } from '../.build/js/drawing/brushPreview.js';
import { getBrushPreset } from '../.build/js/drawing/brushPresets.js';

test('V0.6.5 taper controls start and end independently with a configurable length', () => {
  assert.ok(taperEnvelope(0, { start: 1, end: 0, length: 0.3 }) < 0.25);
  assert.ok(taperEnvelope(0.5, { start: 1, end: 0, length: 0.3 }) > 0.95);
  assert.ok(taperEnvelope(1, { start: 1, end: 0, length: 0.3 }) > 0.95);
  assert.ok(taperEnvelope(1, { start: 0, end: 1, length: 0.3 }) < 0.25);
});

test('V0.6.5 texture sampling responds to scale, rotation and paper grain', () => {
  const base = textureSample(18, 11, { strength: 0.8, scale: 1, rotation: 0, paperGrain: 0.1 }, 7);
  const scaled = textureSample(18, 11, { strength: 0.8, scale: 2.4, rotation: 0, paperGrain: 0.1 }, 7);
  const rotated = textureSample(18, 11, { strength: 0.8, scale: 1, rotation: 0.33, paperGrain: 0.1 }, 7);
  const paper = textureSample(18, 11, { strength: 0.8, scale: 1, rotation: 0, paperGrain: 0.9 }, 7);
  for (const value of [base, scaled, rotated, paper]) assert.ok(value >= 0 && value <= 1);
  assert.notEqual(base, scaled);
  assert.notEqual(base, rotated);
  assert.notEqual(base, paper);
});

test('V0.6.5 brush previews are generated from preset feel instead of generic icons', () => {
  const pencil = buildBrushPreviewModel(getBrushPreset('pencil'));
  const watercolor = buildBrushPreviewModel(getBrushPreset('watercolor'));
  const spray = buildBrushPreviewModel(getBrushPreset('spray'));
  assert.equal(pencil.width, 132);
  assert.ok(pencil.marks.length > 8);
  assert.ok(watercolor.marks.some((mark) => mark.opacity < 0.45));
  assert.ok(spray.marks.length > watercolor.marks.length);
  assert.notDeepEqual(pencil.marks, watercolor.marks);
});

test('V0.6.5 full-stroke progress reaches both taper ends regardless of stroke length', async () => {
  const { strokeProgress } = await import('../.build/js/drawing/advancedBrush.js');
  assert.equal(strokeProgress(0, 101), 0);
  assert.equal(strokeProgress(50, 101), 0.5);
  assert.equal(strokeProgress(100, 101), 1);
  assert.equal(strokeProgress(3, 1), 1);
});

test('V0.6.5 imported image texture converts RGBA pixels to reusable luminance map', async () => {
  const { textureMapFromRgba } = await import('../.build/js/drawing/advancedBrush.js');
  const map = textureMapFromRgba(new Uint8ClampedArray([
    0, 0, 0, 255,
    255, 255, 255, 255,
    255, 0, 0, 128,
    0, 0, 0, 0
  ]), 2, 2);
  assert.equal(map.width, 2);
  assert.equal(map.height, 2);
  assert.equal(map.data.length, 4);
  assert.equal(map.data[0], 0);
  assert.equal(map.data[1], 255);
  assert.ok(map.data[2] > 120 && map.data[2] < 180);
  assert.equal(map.data[3], 255);
});
