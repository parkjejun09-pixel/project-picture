import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const canvasSource = readFileSync(new URL('../src/components/DrawingCanvas.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('V0.6.6 canvas snaps pointer input before stabilization', () => {
  assert.match(canvasSource, /applyAssistToSample/);
  assert.match(canvasSource, /const rawSample\s*=\s*this\.toCanvasSample\(pointerEvent\)[\s\S]*?applyAssistToSample\(rawSample[\s\S]*?stabilizeSample\(this\.previousSample,\s*assistedSample/);
});

test('V0.6.6 symmetry replicates raster dabs and editable vector strokes', () => {
  assert.match(canvasSource, /buildSymmetryPoints/);
  assert.match(canvasSource, /symmetryPointsFor/);
  assert.match(canvasSource, /activeVectorStrokeIds/);
});

test('V0.6.6 assist overlay is a view-only canvas excluded from PNG export', () => {
  assert.match(canvasSource, /assistOverlay/);
  assert.match(canvasSource, /renderAssistOverlay/);
  assert.match(styles, /\.assist-overlay/);
  const exportStart = canvasSource.indexOf('exportPng(');
  const exportEnd = canvasSource.indexOf('\n  addLayer()', exportStart);
  assert.ok(exportStart >= 0 && exportEnd > exportStart);
  assert.doesNotMatch(canvasSource.slice(exportStart, exportEnd), /assistOverlay|renderAssistOverlay/);
});

test('V0.6.6 assist handles dispatch normalized guide, center, horizon and vanishing point edits', () => {
  assert.match(canvasSource, /hitAssistHandle/);
  assert.match(canvasSource, /onAssistChange/);
  assert.match(canvasSource, /perspective-horizon/);
  assert.match(canvasSource, /perspective-vp/);
  assert.match(appSource, /onAssistChange/);
  assert.match(appSource, /guide-position\/set/);
  assert.match(appSource, /perspective-vp\/set/);
});
