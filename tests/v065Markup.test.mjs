import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { brushPanelMarkup } from '../.build/js/components/brushPanelMarkup.js';
import { layerPanelMarkup } from '../.build/js/components/layerPanelMarkup.js';
import { createInitialLayerDocument } from '../.build/js/drawing/layers.js';

test('V0.6.5 Sub Tool uses drawn brush preview surfaces', () => {
  const html = brushPanelMarkup('watercolor');
  assert.match(html, /data-brush-preview/);
  assert.match(html, /brush-preview-surface/);
});

test('V0.6.5 Brush Studio exposes split taper texture controls and a large preview pad', async () => {
  const source = await readFile('src/components/BrushStudioPanel.ts', 'utf8');
  for (const token of ['taper-start','taper-end','taper-length','texture-strength','texture-scale','texture-rotation','paper-grain','brush-preview-pad']) assert.ok(source.includes(token), token);
});

test('V0.6.5 Layer panel exposes special layer creation, search, roles, tags and flatten', () => {
  const html = layerPanelMarkup(createInitialLayerDocument());
  for (const token of ['add-fill','add-gradient','add-correction','add-selection','layer-search','reference-role','draft-role','color-tag','flatten-visible']) assert.ok(html.includes(token), token);
});

test('V0.6.5 Brush Studio exposes image texture import and clear controls', async () => {
  const source = await readFile('src/components/BrushStudioPanel.ts', 'utf8');
  assert.ok(source.includes('texture-image-import'));
  assert.ok(source.includes('texture-image-clear'));
  assert.ok(source.includes('textureMapFromRgba'));
});

test('V0.6.5 DrawingCanvas buffers and replays brush dabs for true end taper', async () => {
  const source = await readFile('src/components/DrawingCanvas.ts', 'utf8');
  assert.ok(source.includes('activeStrokeSamples'));
  assert.ok(source.includes('replayBufferedStroke'));
  assert.ok(source.includes('strokeProgress'));
});

test('V0.6.5 Layer panel exposes dedicated kind role and color-tag filters', () => {
  const html = layerPanelMarkup(createInitialLayerDocument());
  for (const token of ['layer-kind-filter','layer-role-filter','layer-tag-filter']) assert.ok(html.includes(token), token);
});
