import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHex } from '../.build/js/drawing/color.js';

test('normalizeHex expands three-digit colors', () => {
  assert.equal(normalizeHex('#323'), '#332233');
});

test('normalizeHex normalizes case and optional hash', () => {
  assert.equal(normalizeHex('A0bc9F'), '#A0BC9F');
});

test('normalizeHex rejects malformed values', () => {
  assert.equal(normalizeHex('#12'), null);
  assert.equal(normalizeHex('#GGGGGG'), null);
});
