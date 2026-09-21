import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecentColor, toggleFavoriteColor, addProjectColor, extractPaletteFromPixels } from '../.build/js/drawing/palette.js';

test('recent palette deduplicates colors and keeps newest first', () => {
  let colors = [];
  colors = addRecentColor(colors, '#112233', 4);
  colors = addRecentColor(colors, '#445566', 4);
  colors = addRecentColor(colors, '#112233', 4);
  assert.deepEqual(colors, ['#112233', '#445566']);
});

test('favorite and project palettes toggle/add without duplicates', () => {
  assert.deepEqual(toggleFavoriteColor([], '#ABCDEF'), ['#ABCDEF']);
  assert.deepEqual(toggleFavoriteColor(['#ABCDEF'], '#ABCDEF'), []);
  assert.deepEqual(addProjectColor(['#111111'], '#111111'), ['#111111']);
  assert.deepEqual(addProjectColor(['#111111'], '#222222'), ['#111111', '#222222']);
});

test('palette extraction finds dominant opaque colors and ignores transparent pixels', () => {
  const data = new Uint8ClampedArray([
    255,0,0,255, 255,0,0,255, 255,0,0,255,
    0,0,255,255, 0,0,255,255, 0,255,0,0
  ]);
  const palette = extractPaletteFromPixels(data, 3);
  assert.equal(palette[0], '#F80000');
  assert.equal(palette[1], '#0000F8');
  assert.equal(palette.length, 2);
});
