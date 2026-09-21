import test from 'node:test';
import assert from 'node:assert/strict';
import { blendModeToCompositeOperation, flattenLayerTree } from '../.build/js/drawing/compositing.js';
import { addRasterLayer, createInitialLayerDocument, groupActiveNode } from '../.build/js/drawing/layers.js';

test('core blend modes map to Canvas 2D composite operations', () => {
  assert.equal(blendModeToCompositeOperation('normal'), 'source-over');
  assert.equal(blendModeToCompositeOperation('multiply'), 'multiply');
  assert.equal(blendModeToCompositeOperation('screen'), 'screen');
  assert.equal(blendModeToCompositeOperation('overlay'), 'overlay');
  assert.equal(blendModeToCompositeOperation('add'), 'lighter');
});

test('flattenLayerTree preserves bottom-to-top paint order while traversing groups', () => {
  let state = createInitialLayerDocument();
  state = groupActiveNode(state);
  state = addRasterLayer(state);
  const flat = flattenLayerTree(state);
  assert.deepEqual(flat.map((entry) => entry.node.id), ['background', 'paint-1', 'paint-2']);
  assert.equal(flat.find((entry) => entry.node.id === 'paint-1').depth, 1);
});
