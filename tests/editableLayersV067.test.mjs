import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditableLayerData,
  validateEditableLayerData
} from '../.build/js/drawing/editableLayers.js';
import { buildMangaEffectLines } from '../.build/js/drawing/editableLayerRenderer.js';
import {
  addEditableLayer,
  createInitialLayerDocument,
  duplicateActiveNode,
  findLayerNode,
  updateActiveEditableLayer
} from '../.build/js/drawing/layers.js';

const rgba = 'AP8AgP8AAP8='; // [0, 255, 0, 128, 255, 0, 0, 255]

test('V0.6.7 creates complete editable defaults for all six layer kinds', () => {
  const text = createEditableLayerData('text', 640, 480);
  assert.deepEqual(text, {
    kind: 'text', content: 'Text', fontFamily: 'sans-serif', fontSize: 32, fontWeight: 400,
    alignment: 'left', lineHeight: 1.2, letterSpacing: 0, fillColor: '#000000',
    outlineColor: '#FFFFFF', outlineWidth: 0, x: 320, y: 240
  });

  const balloon = createEditableLayerData('balloon', 640, 480);
  assert.equal(balloon.shape, 'ellipse');
  assert.deepEqual(
    { x: balloon.x, y: balloon.y, width: balloon.width, height: balloon.height },
    { x: 192, y: 144, width: 256, height: 144 }
  );
  assert.equal(createEditableLayerData('panel', 640, 480).columns, 2);
  assert.equal(createEditableLayerData('screen-tone', 640, 480).pattern, 'dots');
  assert.equal(createEditableLayerData('manga-effect', 640, 480).effect, 'speed');

  const material = createEditableLayerData('material', 640, 480, { width: 2, height: 1, rgba });
  assert.equal(material.materialType, 'image');
  assert.equal(material.repeat, 'no-repeat');
  assert.deepEqual(material.asset, { width: 2, height: 1, rgba });
});

test('V0.6.7 adds and updates first-class editable nodes without mutating earlier states', () => {
  const original = createInitialLayerDocument();
  const textData = { ...createEditableLayerData('text', 640, 480), content: 'Original' };
  const added = addEditableLayer(original, textData);
  assert.equal(findLayerNode(added, 'text-1').kind, 'text');
  assert.equal(findLayerNode(added, 'text-1').content, 'Original');
  assert.equal(added.activeLayerId, 'text-1');
  assert.equal(original.nodes.length, 2);

  const updated = updateActiveEditableLayer(added, { content: 'Edited', fontSize: 48 });
  assert.equal(findLayerNode(updated, 'text-1').content, 'Edited');
  assert.equal(findLayerNode(updated, 'text-1').fontSize, 48);
  assert.equal(findLayerNode(added, 'text-1').content, 'Original');
});

test('V0.6.7 duplicate and update deep-clone embedded material metadata', () => {
  const material = createEditableLayerData('material', 100, 80, { width: 2, height: 1, rgba });
  const added = addEditableLayer(createInitialLayerDocument(), material);
  const duplicated = duplicateActiveNode(added).state;
  const original = findLayerNode(duplicated, 'material-1');
  const copy = findLayerNode(duplicated, 'material-2');
  assert.notEqual(original.asset, copy.asset);

  copy.asset.rgba = 'AAAAAAAAAAA=';
  assert.equal(original.asset.rgba, rgba);

  const updated = updateActiveEditableLayer(added, { asset: { width: 1, height: 1, rgba: '/wAA/w==' } });
  assert.equal(findLayerNode(updated, 'material-1').asset.rgba, '/wAA/w==');
  assert.equal(findLayerNode(added, 'material-1').asset.rgba, rgba);
});

test('V0.6.7 validation rejects non-finite bounds, unsafe work, and corrupt RGBA assets', () => {
  const tone = createEditableLayerData('screen-tone', 640, 480);
  assert.throws(() => validateEditableLayerData({ ...tone, frequency: 0 }), /frequency/i);
  const text = createEditableLayerData('text', 640, 480);
  assert.throws(() => validateEditableLayerData({ ...text, x: Number.NaN }), /text x/i);
  const effect = createEditableLayerData('manga-effect', 640, 480);
  assert.throws(() => validateEditableLayerData({ ...effect, count: 100_000 }), /count/i);
  const material = createEditableLayerData('material', 640, 480, { width: 2, height: 1, rgba });
  assert.throws(() => validateEditableLayerData({ ...material, asset: { ...material.asset, rgba: '/wAA/w==' } }), /byte length/i);
  assert.throws(() => createEditableLayerData('material', 640, 480), /asset/i);
});

test('V0.6.7 seeded manga geometry is deterministic and bounded', () => {
  const effect = { ...createEditableLayerData('manga-effect', 320, 200), seed: 42, count: 12 };
  const first = buildMangaEffectLines(effect, 320, 200);
  const second = buildMangaEffectLines(effect, 320, 200);
  const changed = buildMangaEffectLines({ ...effect, seed: 43 }, 320, 200);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, changed);
  assert.equal(first.length, 12);
  for (const line of first) {
    for (const value of [line.x1, line.y1, line.x2, line.y2, line.width]) assert.equal(Number.isFinite(value), true);
    assert.ok(line.width > 0 && line.width <= effect.width);
  }
});
