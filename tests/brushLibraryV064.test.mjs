import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBrushPresets, toggleBrushFavorite, serializeCustomBrush, parseCustomBrush } from '../.build/js/drawing/brushLibrary.js';
import { BRUSH_PRESETS } from '../.build/js/drawing/brushPresets.js';

test('brush library searches labels and categories',()=>{
  assert.ok(filterBrushPresets(BRUSH_PRESETS,'water').some(p=>p.id==='watercolor'));
  assert.ok(filterBrushPresets(BRUSH_PRESETS,'texture').some(p=>p.id==='chalk'));
});
test('brush favorites toggle without duplicates',()=>{
  let fav=toggleBrushFavorite([], 'inking'); fav=toggleBrushFavorite(fav,'inking'); assert.deepEqual(fav,[]);
});
test('custom brush serialization round-trips validated preset data',()=>{
  const json=serializeCustomBrush(BRUSH_PRESETS[0]); const parsed=parseCustomBrush(json); assert.equal(parsed?.label,BRUSH_PRESETS[0].label); assert.equal(parsed?.size,BRUSH_PRESETS[0].size);
});
