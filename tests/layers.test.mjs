import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addRasterLayer,
  createInitialLayerDocument,
  deleteActiveNode,
  duplicateActiveNode,
  findLayerNode,
  getChildren,
  getMergeDownTargetId,
  groupActiveNode,
  moveActiveNode,
  removeLayerMask,
  selectLayerNode,
  setActiveBlendMode,
  setActiveOpacity,
  toggleActiveAlphaLock,
  toggleActiveClipping,
  toggleLayerVisibility,
  addLayerMask,
  selectLayerMask,
  renameActiveNode
} from '../.build/js/drawing/layers.js';

test('initial layer document contains a locked white background and one raster layer', () => {
  const state = createInitialLayerDocument();
  assert.equal(state.nodes.length, 2);
  assert.equal(state.nodes[0].id, 'background');
  assert.equal(state.nodes[0].kind, 'background');
  assert.equal(state.nodes[0].locked, true);
  assert.equal(state.activeLayerId, 'paint-1');
  assert.equal(state.activeTarget, 'content');
});

test('adding a raster layer places it above the active sibling and selects it', () => {
  const state = addRasterLayer(createInitialLayerDocument());
  assert.equal(state.nodes.length, 3);
  assert.equal(state.activeLayerId, 'paint-2');
  assert.equal(state.nodes.at(-1).id, 'paint-2');
  assert.equal(state.nodes.at(-1).name, 'Paint Layer 2');
});

test('layer properties update while preserving constrained values', () => {
  let state = createInitialLayerDocument();
  state = renameActiveNode(state, 'Line Art');
  state = setActiveOpacity(state, 2);
  state = setActiveBlendMode(state, 'multiply');
  state = toggleActiveAlphaLock(state);
  state = toggleActiveClipping(state);
  const node = findLayerNode(state, state.activeLayerId);
  assert.equal(node.name, 'Line Art');
  assert.equal(node.opacity, 1);
  assert.equal(node.blendMode, 'multiply');
  assert.equal(node.alphaLock, true);
  assert.equal(node.clipping, true);
});

test('visibility can be toggled for any layer including the background', () => {
  const state = toggleLayerVisibility(createInitialLayerDocument(), 'background');
  assert.equal(findLayerNode(state, 'background').visible, false);
});

test('active raster layers can move among siblings without crossing the background floor', () => {
  let state = addRasterLayer(createInitialLayerDocument());
  state = selectLayerNode(state, 'paint-1');
  state = moveActiveNode(state, 'up');
  assert.deepEqual(state.nodes.map((node) => node.id), ['background', 'paint-2', 'paint-1']);
  state = moveActiveNode(state, 'down');
  assert.deepEqual(state.nodes.map((node) => node.id), ['background', 'paint-1', 'paint-2']);
});

test('duplicate creates a distinct raster node and exposes the source-to-copy id map', () => {
  const result = duplicateActiveNode(createInitialLayerDocument());
  assert.equal(result.state.nodes.length, 3);
  assert.equal(result.state.activeLayerId, 'paint-2');
  assert.equal(result.idMap.get('paint-1'), 'paint-2');
  assert.equal(findLayerNode(result.state, 'paint-2').name, 'Paint Layer 1 copy');
});

test('grouping wraps the active layer in a real group and keeps the raster selected', () => {
  const state = groupActiveNode(createInitialLayerDocument());
  const group = state.nodes.find((node) => node.kind === 'group');
  assert.ok(group);
  assert.equal(findLayerNode(state, 'paint-1').parentId, group.id);
  assert.deepEqual(getChildren(state, group.id).map((node) => node.id), ['paint-1']);
  assert.equal(state.activeLayerId, 'paint-1');
});

test('masks can be added, selected, and removed', () => {
  let state = addLayerMask(createInitialLayerDocument());
  assert.equal(findLayerNode(state, 'paint-1').hasMask, true);
  state = selectLayerMask(state);
  assert.equal(state.activeTarget, 'mask');
  state = removeLayerMask(state);
  assert.equal(findLayerNode(state, 'paint-1').hasMask, false);
  assert.equal(state.activeTarget, 'content');
});

test('merge-down targets the nearest lower raster sibling and delete chooses a sensible selection', () => {
  let state = addRasterLayer(createInitialLayerDocument());
  assert.equal(getMergeDownTargetId(state), 'paint-1');
  state = deleteActiveNode(state);
  assert.equal(state.activeLayerId, 'paint-1');
  assert.equal(state.nodes.length, 2);
});

test('V0.6 can add a first-class vector layer', async () => {
  const { addVectorLayer } = await import('../.build/js/drawing/layers.js');
  const state = addVectorLayer(createInitialLayerDocument());
  const vector = findLayerNode(state, state.activeLayerId);
  assert.equal(vector.kind, 'vector');
  assert.equal(vector.name, 'Vector Layer 1');
  assert.equal(state.nextVectorNumber, 2);
});

test('vector layer can be rasterized without losing its place in the layer tree', async () => {
  const { addVectorLayer, rasterizeActiveVectorLayer } = await import('../.build/js/drawing/layers.js');
  let state = addVectorLayer(createInitialLayerDocument());
  const id = state.activeLayerId;
  state = rasterizeActiveVectorLayer(state);
  const node = findLayerNode(state, id);
  assert.equal(node.kind, 'raster');
  assert.equal(node.name, 'Vector Layer 1');
});
