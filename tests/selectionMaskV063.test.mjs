import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEllipseMask,
  createPolygonMask,
  createSelectionPenMask,
  combineSelectionMasks,
  expandSelectionMask,
  contractSelectionMask,
  featherSelectionMask,
  invertSelectionMask,
  maskBounds
} from '../.build/js/drawing/selectionMask.js';

test('ellipse and polygon masks create bounded irregular selections', () => {
  const ellipse = createEllipseMask(9, 9, { x: 1, y: 2, width: 6, height: 4 });
  assert.equal(ellipse[4 * 9 + 4], 255);
  assert.equal(ellipse[2 * 9 + 1], 0);
  assert.deepEqual(maskBounds(ellipse, 9, 9), { x: 1, y: 2, width: 6, height: 4 });

  const polygon = createPolygonMask(8, 8, [{ x: 1, y: 1 }, { x: 6, y: 1 }, { x: 3, y: 6 }]);
  assert.equal(polygon[3 * 8 + 3], 255);
  assert.equal(polygon[7 * 8 + 7], 0);
});

test('selection pen paints a continuous pressure-independent mask path', () => {
  const mask = createSelectionPenMask(12, 6, [{ x: 1, y: 3 }, { x: 10, y: 3 }], 3);
  for (let x = 1; x <= 10; x += 1) assert.ok(mask[3 * 12 + x] > 0);
  assert.equal(mask[0], 0);
});

test('selection masks support add subtract intersect and invert', () => {
  const a = new Uint8Array([255, 255, 0, 0]);
  const b = new Uint8Array([0, 255, 255, 0]);
  assert.deepEqual([...combineSelectionMasks(a, b, 'add')], [255, 255, 255, 0]);
  assert.deepEqual([...combineSelectionMasks(a, b, 'subtract')], [255, 0, 0, 0]);
  assert.deepEqual([...combineSelectionMasks(a, b, 'intersect')], [0, 255, 0, 0]);
  assert.deepEqual([...invertSelectionMask(a)], [0, 0, 255, 255]);
});

test('expand contract and feather refine a mask without changing its dimensions', () => {
  const mask = new Uint8Array(7 * 7);
  mask[3 * 7 + 3] = 255;
  const expanded = expandSelectionMask(mask, 7, 7, 2);
  assert.equal(expanded.length, mask.length);
  assert.ok(expanded[3 * 7 + 1] > 0);
  const contracted = contractSelectionMask(expanded, 7, 7, 1);
  assert.ok(contracted[3 * 7 + 3] > 0);
  const feathered = featherSelectionMask(expanded, 7, 7, 2);
  assert.equal(feathered.length, mask.length);
  assert.ok(feathered[3 * 7 + 3] > feathered[0]);
  assert.ok(feathered[3 * 7 + 1] > 0 && feathered[3 * 7 + 1] < 255);
});
