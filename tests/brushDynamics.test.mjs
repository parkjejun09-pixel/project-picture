import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDynamicDabStyle } from '../.build/js/drawing/brushDynamics.js';

const settings = {
  size: 40,
  opacity: 0.8,
  pressureResponse: 0,
  pressureSize: 1,
  pressureOpacity: 1,
  tiltInfluence: 1,
  hardness: 0.8
};

test('brush dynamics use pressure to change dab size and opacity', () => {
  const light = buildDynamicDabStyle('brush', '#336699', settings, { x: 0, y: 0, pressure: 0.2, tiltX: 0, tiltY: 0 });
  const heavy = buildDynamicDabStyle('brush', '#336699', settings, { x: 0, y: 0, pressure: 0.9, tiltX: 0, tiltY: 0 });
  assert.ok(heavy.radiusX > light.radiusX);
  assert.ok(heavy.globalAlpha > light.globalAlpha);
});

test('brush dynamics widen a tilted stylus dab', () => {
  const flat = buildDynamicDabStyle('brush', '#336699', settings, { x: 0, y: 0, pressure: 1, tiltX: 0, tiltY: 0 });
  const tilted = buildDynamicDabStyle('brush', '#336699', settings, { x: 0, y: 0, pressure: 1, tiltX: 60, tiltY: 0 });
  assert.ok(tilted.radiusX > flat.radiusX);
  assert.ok(tilted.radiusY < tilted.radiusX);
});
