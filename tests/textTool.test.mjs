import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTextSize, textLines } from '../.build/js/drawing/textTool.js';

test('text foundation clamps font size to a useful drawing range', () => {
  assert.equal(normalizeTextSize(1), 6);
  assert.equal(normalizeTextSize(500), 300);
  assert.equal(normalizeTextSize(42), 42);
});

test('text foundation preserves intentional line breaks', () => {
  assert.deepEqual(textLines('Hello\nStudio'), ['Hello','Studio']);
});
