import test from 'node:test';
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState } from '../.build/js/editor/editorReducer.js';

test('editorReducer selects drawing tools', () => {
  const next = editorReducer(initialEditorState, { type: 'tool/set', tool: 'eraser' });
  assert.equal(next.tool, 'eraser');
});

test('editorReducer switches between standard and advanced workspace modes', () => {
  const next = editorReducer(initialEditorState, { type: 'mode/set', mode: 'advanced' });
  assert.equal(next.mode, 'advanced');
});

test('editorReducer applies only valid normalized hex colors', () => {
  const valid = editorReducer(initialEditorState, { type: 'color/set', value: '#323' });
  assert.equal(valid.color, '#332233');
  const invalid = editorReducer(valid, { type: 'color/set', value: '#nope' });
  assert.equal(invalid.color, '#332233');
});

test('editorReducer clamps brush controls and zoom', () => {
  let state = editorReducer(initialEditorState, { type: 'brush-size/set', value: 500 });
  state = editorReducer(state, { type: 'opacity/set', value: 0 });
  state = editorReducer(state, { type: 'spacing/set', value: 70 });
  state = editorReducer(state, { type: 'zoom/set', value: 10 });
  assert.equal(state.brushSize, 200);
  assert.equal(state.opacity, 0.01);
  assert.equal(state.spacing, 40);
  assert.equal(state.zoom, 4);
});

test('editorReducer updates and resets pan', () => {
  let state = editorReducer(initialEditorState, { type: 'pan/set', x: 30, y: -20 });
  assert.deepEqual(state.pan, { x: 30, y: -20 });
  state = editorReducer(state, { type: 'view/reset' });
  assert.deepEqual(state.pan, { x: 0, y: 0 });
  assert.equal(state.zoom, 1);
});

test('editorReducer applies a brush preset and exposes V0.2 dynamics controls', () => {
  let state = editorReducer(initialEditorState, { type: 'brush-preset/set', preset: 'pencil' });
  assert.equal(state.brushPreset, 'pencil');
  assert.ok(state.tiltInfluence > 0.5);
  state = editorReducer(state, { type: 'stabilizer/set', value: 140 });
  state = editorReducer(state, { type: 'pressure-response/set', value: -4 });
  state = editorReducer(state, { type: 'pressure-size/set', value: 3 });
  state = editorReducer(state, { type: 'pressure-opacity/set', value: -1 });
  state = editorReducer(state, { type: 'tilt-influence/set', value: 2 });
  assert.equal(state.stabilizer, 100);
  assert.equal(state.pressureResponse, -1);
  assert.equal(state.pressureSize, 1);
  assert.equal(state.pressureOpacity, 0);
  assert.equal(state.tiltInfluence, 1);
});

test('V0.4 color palettes and fill controls are persistent editor state', () => {
  let state = editorReducer(initialEditorState, { type: 'color/set', value: '#336699' });
  assert.equal(state.recentColors[0], '#336699');
  state = editorReducer(state, { type: 'favorite-color/toggle', value: '#336699' });
  state = editorReducer(state, { type: 'project-color/add', value: '#336699' });
  state = editorReducer(state, { type: 'fill-tolerance/set', value: 300 });
  state = editorReducer(state, { type: 'fill-gap/set', value: 99 });
  state = editorReducer(state, { type: 'fill-expansion/set', value: -5 });
  state = editorReducer(state, { type: 'fill-antialias/set', value: false });
  state = editorReducer(state, { type: 'fill-reference/set', value: 'line-art' });
  assert.deepEqual(state.favoriteColors, ['#336699']);
  assert.deepEqual(state.projectColors, ['#336699']);
  assert.equal(state.fillTolerance, 255);
  assert.equal(state.fillGapClosing, 8);
  assert.equal(state.fillExpansion, 0);
  assert.equal(state.fillAntialias, false);
  assert.equal(state.fillReference, 'line-art');
});

test('V0.5 workspace preferences mirror and personalize the editor shell', () => {
  let state = editorReducer(initialEditorState, { type: 'handedness/set', value: 'left' });
  state = editorReducer(state, { type: 'canvas-surround/set', value: 'dark' });
  state = editorReducer(state, { type: 'ui-density/set', value: 'compact' });
  state = editorReducer(state, { type: 'shortcut-profile/set', value: 'clip' });
  state = editorReducer(state, { type: 'panel/toggle', panelId: 'navigator' });
  assert.equal(state.handedness, 'left');
  assert.equal(state.canvasSurround, 'dark');
  assert.equal(state.uiDensity, 'compact');
  assert.equal(state.shortcutProfile, 'clip');
  assert.deepEqual(state.collapsedPanels, ['navigator']);
  state = editorReducer(state, { type: 'panel/toggle', panelId: 'navigator' });
  assert.deepEqual(state.collapsedPanels, []);
});

test('V0.6.2 editor state tracks core tool options', () => {
  let state = editorReducer(initialEditorState, { type: 'secondary-color/set', value: '#abc' });
  state = editorReducer(state, { type: 'gradient-mode/set', value: 'radial' });
  state = editorReducer(state, { type: 'shape-type/set', value: 'ellipse' });
  state = editorReducer(state, { type: 'shape-fill/set', value: true });
  state = editorReducer(state, { type: 'magic-wand-tolerance/set', value: 999 });
  state = editorReducer(state, { type: 'text-value/set', value: 'Hello Studio' });
  state = editorReducer(state, { type: 'text-size/set', value: 999 });
  state = editorReducer(state, { type: 'text-font/set', value: 'serif' });
  state = editorReducer(state, { type: 'fill-mode/set', value: 'unpainted' });
  assert.equal(state.secondaryColor, '#AABBCC');
  assert.equal(state.gradientMode, 'radial');
  assert.equal(state.shapeType, 'ellipse');
  assert.equal(state.shapeFill, true);
  assert.equal(state.magicWandTolerance, 255);
  assert.equal(state.textValue, 'Hello Studio');
  assert.equal(state.textSize, 300);
  assert.equal(state.textFont, 'serif');
  assert.equal(state.fillMode, 'unpainted');
});

test('V0.6.3 editor state tracks selection refinement and transform modes', () => {
  let state = editorReducer(initialEditorState, { type: 'selection-shape/set', value: 'ellipse' });
  state = editorReducer(state, { type: 'selection-mode/set', value: 'subtract' });
  state = editorReducer(state, { type: 'selection-feather/set', value: 999 });
  state = editorReducer(state, { type: 'selection-pen-size/set', value: 0 });
  state = editorReducer(state, { type: 'transform-mode/set', value: 'mesh' });
  assert.equal(state.selectionShape, 'ellipse');
  assert.equal(state.selectionMode, 'subtract');
  assert.equal(state.selectionFeather, 128);
  assert.equal(state.selectionPenSize, 1);
  assert.equal(state.transformMode, 'mesh');
});

test('V0.6.4 editor state tracks advanced brush dynamics and expanded tools', () => {
  let state = editorReducer(initialEditorState, { type: 'brush-preset/set', preset: 'watercolor' });
  assert.ok(state.wetMix > 0.5);
  state = editorReducer(state, { type: 'flow/set', value: 2 });
  state = editorReducer(state, { type: 'scatter/set', value: -1 });
  state = editorReducer(state, { type: 'grain/set', value: 0.6 });
  state = editorReducer(state, { type: 'tool/set', tool: 'smudge' });
  assert.equal(state.flow, 1);
  assert.equal(state.scatter, 0);
  assert.equal(state.grain, 0.6);
  assert.equal(state.tool, 'smudge');
});

test('V0.6.6 editor state tracks ruler assist configuration with safe clamps', () => {
  let state = editorReducer(initialEditorState, { type: 'tool/set', tool: 'assist' });
  state = editorReducer(state, { type: 'assist-mode/set', value: 'symmetry' });
  state = editorReducer(state, { type: 'assist-snap/set', value: false });
  state = editorReducer(state, { type: 'grid-size/set', value: 9999 });
  state = editorReducer(state, { type: 'guide-orientation/set', value: 'horizontal' });
  state = editorReducer(state, { type: 'guide-position/set', value: -4 });
  state = editorReducer(state, { type: 'straight-angle/set', value: -45 });
  state = editorReducer(state, { type: 'parallel-angle/set', value: 725 });
  state = editorReducer(state, { type: 'radial-center/set', x: 2, y: -2 });
  state = editorReducer(state, { type: 'radial-rays/set', value: 999 });
  state = editorReducer(state, { type: 'concentric-spacing/set', value: 1 });
  state = editorReducer(state, { type: 'symmetry-axes/set', value: 99 });
  state = editorReducer(state, { type: 'symmetry-center/set', x: 0.25, y: 0.75 });
  assert.equal(state.tool, 'assist');
  assert.equal(state.assistMode, 'symmetry');
  assert.equal(state.assistSnapEnabled, false);
  assert.equal(state.gridSize, 512);
  assert.equal(state.guideOrientation, 'horizontal');
  assert.equal(state.guidePosition, 0);
  assert.equal(state.straightAngle, 315);
  assert.equal(state.parallelAngle, 5);
  assert.deepEqual([state.radialCenterX, state.radialCenterY], [1, 0]);
  assert.equal(state.radialRays, 72);
  assert.equal(state.concentricSpacing, 4);
  assert.equal(state.symmetryAxes, 12);
  assert.deepEqual([state.symmetryCenterX, state.symmetryCenterY], [0.25, 0.75]);
});

test('V0.6.6 perspective state resets defaults per mode and edits normalized horizon and vanishing points', () => {
  let state = editorReducer(initialEditorState, { type: 'perspective-mode/set', value: 'three' });
  assert.equal(state.perspectiveMode, 'three');
  assert.equal(state.perspectiveVanishingPoints.length, 3);
  state = editorReducer(state, { type: 'perspective-horizon/set', value: 2 });
  state = editorReducer(state, { type: 'perspective-vp/set', index: 1, x: -1, y: 0.25 });
  assert.equal(state.perspectiveHorizonY, 1);
  assert.deepEqual(state.perspectiveVanishingPoints[1], { x: 0, y: 0.25 });
});
