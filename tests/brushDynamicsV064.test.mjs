import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdvancedDab } from '../.build/js/drawing/advancedBrush.js';

const base = { compositeOperation:'source-over', fillStyle:'#336699', globalAlpha:0.8, radiusX:20, radiusY:20, rotation:0, hardness:0.8 };
const settings = { flow:0.5, velocitySize:0.8, rotation:0.25, taper:0.5, scatter:0.7, sizeJitter:0.4, angleJitter:0.5, colorJitter:0.25, grain:0.4, dualBrush:0.2 };

test('advanced brush lowers size at high velocity and applies flow', () => {
  const slow = buildAdvancedDab(base,{x:20,y:20,pressure:1,tiltX:0,tiltY:0},{x:19,y:20,pressure:1,tiltX:0,tiltY:0},settings,4,0.5);
  const fast = buildAdvancedDab(base,{x:40,y:20,pressure:1,tiltX:0,tiltY:0},{x:10,y:20,pressure:1,tiltX:0,tiltY:0},settings,4,0.5);
  assert.ok(fast.style.radiusX < slow.style.radiusX);
  assert.ok(slow.style.globalAlpha < base.globalAlpha);
});

test('advanced brush scatter and jitter are deterministic for the same dab', () => {
  const a = buildAdvancedDab(base,{x:10,y:10,pressure:.7,tiltX:0,tiltY:0},null,settings,12,.8);
  const b = buildAdvancedDab(base,{x:10,y:10,pressure:.7,tiltX:0,tiltY:0},null,settings,12,.8);
  assert.deepEqual(a,b);
  assert.notEqual(a.x,10);
  assert.notEqual(a.style.rotation,0);
  assert.notEqual(a.style.fillStyle,'#336699');
});
