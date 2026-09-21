import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPressure, pressureCurvePath } from '../.build/js/drawing/pressure.js';

test('mapPressure keeps linear response unchanged and clamps input', () => {
  assert.equal(mapPressure(0.25, 0), 0.25);
  assert.equal(mapPressure(-1, 0), 0);
  assert.equal(mapPressure(2, 0), 1);
});

test('mapPressure makes positive response softer and negative response firmer', () => {
  const raw = 0.25;
  assert.ok(mapPressure(raw, 1) > raw);
  assert.ok(mapPressure(raw, -1) < raw);
});

test('pressureCurvePath creates an svg path anchored at the curve endpoints', () => {
  const path = pressureCurvePath(0, 100, 60, 4);
  assert.match(path, /^M 0 60 /);
  assert.match(path, /100 0$/);
});
