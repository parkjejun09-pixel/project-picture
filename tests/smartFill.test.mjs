import test from 'node:test';
import assert from 'node:assert/strict';
import { createFillMask, expandFillMask, applyFillColor } from '../.build/js/drawing/smartFill.js';

function bufferFromRows(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) => row.forEach((value, x) => {
    const offset = (y * width + x) * 4;
    const channel = value === 1 ? 0 : 255;
    data.set([channel, channel, channel, 255], offset);
  }));
  return { width, height, data };
}

test('smart fill flood-fills a bounded region without crossing dark line pixels', () => {
  const source = bufferFromRows([
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ]);
  const mask = createFillMask(source, 2, 2, { tolerance: 8, gapClosing: 0 });
  assert.equal(mask.reduce((sum, value) => sum + (value ? 1 : 0), 0), 9);
});

test('gap closing prevents flood fill from escaping through a one-pixel opening', () => {
  const source = bufferFromRows([
    [1,1,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ]);
  const open = createFillMask(source, 2, 2, { tolerance: 8, gapClosing: 0 });
  const closed = createFillMask(source, 2, 2, { tolerance: 8, gapClosing: 1 });
  assert.ok(open[2] === 1);
  assert.equal(closed[2], 0);
  assert.ok(closed.reduce((sum, value) => sum + (value ? 1 : 0), 0) < open.reduce((sum, value) => sum + (value ? 1 : 0), 0));
});

test('fill expansion grows the region underneath line art', () => {
  const mask = new Uint8Array([
    0,0,0,
    0,1,0,
    0,0,0
  ]);
  const expanded = expandFillMask(mask, 3, 3, 1);
  assert.equal(expanded.reduce((sum, value) => sum + (value ? 1 : 0), 0), 9);
});

test('applyFillColor only changes mask pixels and preserves requested alpha', () => {
  const target = { width: 2, height: 1, data: new Uint8ClampedArray([0,0,0,0, 10,20,30,255]) };
  applyFillColor(target, new Uint8Array([1,0]), '#336699', 0.5);
  assert.deepEqual([...target.data], [51,102,153,128, 10,20,30,255]);
});
