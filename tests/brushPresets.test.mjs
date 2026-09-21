import test from 'node:test';
import assert from 'node:assert/strict';
import { BRUSH_PRESETS, getBrushPreset } from '../.build/js/drawing/brushPresets.js';

test('V0.6.4 preserves the original four presets and expands the library', () => {
  assert.deepEqual(BRUSH_PRESETS.slice(0,4).map((preset) => preset.id), ['pencil', 'inking', 'marker', 'airbrush']);
  for (const id of ['watercolor','oil','chalk','spray']) assert.ok(BRUSH_PRESETS.some((preset)=>preset.id===id));
});

test('brush presets carry feel settings used by the brush engine', () => {
  const pencil = getBrushPreset('pencil');
  const airbrush = getBrushPreset('airbrush');
  assert.ok(pencil.tiltInfluence > 0.5);
  assert.ok(airbrush.hardness < 0.3);
  assert.notEqual(pencil.size, airbrush.size);
});
