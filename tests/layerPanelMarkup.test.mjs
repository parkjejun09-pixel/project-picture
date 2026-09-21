import test from 'node:test';
import assert from 'node:assert/strict';
import { layerPanelMarkup } from '../.build/js/components/layerPanelMarkup.js';
import { addLayerMask, addRasterLayer, createInitialLayerDocument, groupActiveNode, selectLayerNode } from '../.build/js/drawing/layers.js';

test('layer panel markup exposes V0.3 document actions and compositing controls', () => {
  let state = createInitialLayerDocument();
  state = addLayerMask(state);
  state = groupActiveNode(state);
  state = addRasterLayer(state);
  state = selectLayerNode(state, 'paint-1');
  const html = layerPanelMarkup(state);
  for (const token of [
    'data-layer-action="add"',
    'data-layer-action="group"',
    'data-layer-action="duplicate"',
    'data-layer-action="merge"',
    'data-layer-action="delete"',
    'data-control="layer-opacity"',
    'data-control="blend-mode"',
    'data-layer-action="alpha-lock"',
    'data-layer-action="clipping"',
    'data-layer-action="mask"',
    'data-layer-id="paint-1"',
    'data-layer-id="background"'
  ]) assert.match(html, new RegExp(token));
});
