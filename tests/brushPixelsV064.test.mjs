import test from 'node:test';
import assert from 'node:assert/strict';
import { blurPixels, smudgePixels, mixHexColors } from '../.build/js/drawing/brushPixels.js';

test('blur spreads a bright center pixel into neighbors', () => {
  const data = new Uint8ClampedArray(5*5*4); const i=(2*5+2)*4; data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=255;
  const out=blurPixels(data,5,5,2,2,2,1);
  assert.ok(out[(2*5+1)*4]>0); assert.ok(out[i]<255);
});

test('smudge drags source color toward destination', () => {
  const data = new Uint8ClampedArray(6*3*4); const src=(1*6+1)*4; data[src]=255;data[src+3]=255;
  const out=smudgePixels(data,6,3,{x:1,y:1},{x:4,y:1},1,1);
  assert.ok(out[(1*6+4)*4]>0);
});

test('wet mix blends two hex colors', () => {
  assert.equal(mixHexColors('#FF0000','#0000FF',0.5),'#800080');
});
