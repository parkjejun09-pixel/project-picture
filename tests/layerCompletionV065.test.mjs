import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addFillLayer,
  addGradientLayer,
  addCorrectionLayer,
  addSelectionLayer,
  createInitialLayerDocument,
  findLayerNode,
  filterLayerNodes,
  setActiveColorTag,
  setActiveRasterRole,
  updateActiveSpecialLayer,
  isLayerExportable
} from '../.build/js/drawing/layers.js';

test('V0.6.5 creates first-class fill gradient correction and selection layers', () => {
  let state = createInitialLayerDocument();
  state = addFillLayer(state, '#336699');
  assert.equal(findLayerNode(state, state.activeLayerId).kind, 'fill');
  state = addGradientLayer(state, '#111111', '#EEEEEE');
  assert.equal(findLayerNode(state, state.activeLayerId).kind, 'gradient');
  state = addCorrectionLayer(state, 'brightness-contrast');
  assert.equal(findLayerNode(state, state.activeLayerId).kind, 'correction');
  state = addSelectionLayer(state);
  assert.equal(findLayerNode(state, state.activeLayerId).kind, 'selection');
});

test('V0.6.5 fill gradient and correction layer parameters are editable non-destructively', () => {
  let state = addFillLayer(createInitialLayerDocument(), '#336699');
  state = updateActiveSpecialLayer(state, { color: '#AA5500' });
  assert.equal(findLayerNode(state, state.activeLayerId).color, '#AA5500');
  state = addGradientLayer(state, '#000000', '#FFFFFF');
  state = updateActiveSpecialLayer(state, { angle: 45, radial: true });
  const gradient = findLayerNode(state, state.activeLayerId);
  assert.equal(gradient.angle, 45);
  assert.equal(gradient.radial, true);
  state = addCorrectionLayer(state, 'brightness-contrast');
  state = updateActiveSpecialLayer(state, { brightness: 18, contrast: -12 });
  const correction = findLayerNode(state, state.activeLayerId);
  assert.equal(correction.brightness, 18);
  assert.equal(correction.contrast, -12);
});

test('V0.6.5 raster layers can be marked as reference or draft and colored for organization', () => {
  let state = createInitialLayerDocument();
  state = setActiveRasterRole(state, 'reference');
  state = setActiveColorTag(state, 'blue');
  let node = findLayerNode(state, state.activeLayerId);
  assert.equal(node.role, 'reference');
  assert.equal(node.colorTag, 'blue');
  state = setActiveRasterRole(state, 'draft');
  node = findLayerNode(state, state.activeLayerId);
  assert.equal(node.role, 'draft');
});

test('V0.6.5 layer search filters by name kind role and color tag', () => {
  let state = createInitialLayerDocument();
  state = setActiveRasterRole(state, 'reference');
  state = setActiveColorTag(state, 'blue');
  state = addFillLayer(state, '#336699');
  assert.deepEqual(filterLayerNodes(state, { query: 'fill' }).map((n) => n.kind), ['fill']);
  assert.deepEqual(filterLayerNodes(state, { role: 'reference' }).map((n) => n.id), ['paint-1']);
  assert.deepEqual(filterLayerNodes(state, { colorTag: 'blue' }).map((n) => n.id), ['paint-1']);
});


test('V0.6.5 draft raster role stays a document layer but is excluded from final export', () => {
  let state = createInitialLayerDocument();
  assert.equal(isLayerExportable(findLayerNode(state, state.activeLayerId)), true);
  state = setActiveRasterRole(state, 'draft');
  assert.equal(isLayerExportable(findLayerNode(state, state.activeLayerId)), false);
  assert.equal(isLayerExportable(findLayerNode(state, 'background')), true);
});
