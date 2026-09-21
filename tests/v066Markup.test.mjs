import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { commandBarMarkup } from '../.build/js/components/CommandBar.js';
import { assistPanelMarkup } from '../.build/js/components/AssistPanel.js';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';

test('V0.6.6 toolbar and command bar expose real Assist and Snap controls', async () => {
  const toolbarSource = await readFile('src/components/ToolBar.ts', 'utf8');
  assert.match(toolbarSource, /tool:\s*['"]assist['"]/);
  const html = commandBarMarkup({ ...initialEditorState, assistSnapEnabled: true });
  assert.match(html, /data-action="snap-toggle"/);
  assert.match(html, /Snap/);
  assert.ok(!html.includes('visual placeholder'));
});

test('V0.6.6 Assist palette exposes standard and advanced ruler modes', () => {
  const html = assistPanelMarkup({ ...initialEditorState, assistMode: 'symmetry', symmetryAxes: 6 });
  for (const token of ['data-assist-mode="grid"','data-assist-mode="guide"','data-assist-mode="straight"','data-assist-mode="parallel"','data-assist-mode="curve"','data-assist-mode="radial"','data-assist-mode="concentric"','data-assist-mode="symmetry"','data-assist-mode="perspective"']) assert.ok(html.includes(token), token);
  assert.match(html, /data-assist-control="symmetry-axes"/);
  assert.match(html, /data-perspective-mode="three"/);
  assert.match(html, /data-advanced-only/);
});

test('V0.6.6 Properties and App wire Assist context and callbacks', async () => {
  const properties = await readFile('src/components/PropertiesPanel.ts', 'utf8');
  const app = await readFile('src/App.ts', 'utf8');
  assert.match(properties, /tool === ['"]assist['"]/);
  assert.match(properties, /data-assist-mode/);
  assert.match(app, /new AssistPanel/);
  assert.match(app, /onSnapToggle/);
  assert.match(app, /assistPanel\?\.update/);
});
