import test from 'node:test';
import assert from 'node:assert/strict';
import { gradientParameter, interpolateHex } from '../.build/js/drawing/gradient.js';

test('linear gradient parameter projects a point onto the drag axis', () => {
  assert.equal(gradientParameter({x:0,y:0},{x:10,y:0},{x:5,y:3},'linear'), 0.5);
  assert.equal(gradientParameter({x:0,y:0},{x:10,y:0},{x:20,y:0},'linear'), 1);
});

test('radial gradient parameter uses distance from the start point', () => {
  assert.equal(gradientParameter({x:0,y:0},{x:0,y:10},{x:0,y:5},'radial'), 0.5);
});

test('gradient color interpolation blends RGB channels', () => {
  assert.equal(interpolateHex('#000000','#FFFFFF',0.5), '#808080');
  assert.equal(interpolateHex('#FF0000','#0000FF',0.25), '#BF0040');
});
