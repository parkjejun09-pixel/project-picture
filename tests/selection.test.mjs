import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelectionRect, clampSelectionRect, translateSelectionRect } from '../.build/js/drawing/selection.js';

test('selection rect normalizes reverse drags', () => {
  assert.deepEqual(normalizeSelectionRect({ x: 80, y: 70 }, { x: 20, y: 10 }), { x: 20, y: 10, width: 60, height: 60 });
});

test('selection rect clamps to document bounds', () => {
  assert.deepEqual(clampSelectionRect({ x: -10, y: 20, width: 80, height: 100 }, 100, 80), { x: 0, y: 20, width: 70, height: 60 });
});

test('selection rect translation stays within document', () => {
  assert.deepEqual(translateSelectionRect({ x: 70, y: 50, width: 20, height: 20 }, 50, 40, 100, 80), { x: 80, y: 60, width: 20, height: 20 });
});
