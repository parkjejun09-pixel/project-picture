import test from 'node:test';
import assert from 'node:assert/strict';
import { colorSetMarkup } from '../.build/js/components/ColorSetPanel.js';
import { colorPanelMarkup } from '../.build/js/components/ColorPanel.js';
import { brushPanelMarkup } from '../.build/js/components/brushPanelMarkup.js';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';

test('V0.6.1 color palette keeps a large wheel visible while moving deep color tools behind details', () => {
  const markup = colorPanelMarkup(initialEditorState);
  assert.match(markup, /data-control="hue-wheel"/);
  assert.match(markup, /class="sv-square sv-disc"/);
  assert.match(markup, /data-control="hex"/);
  assert.match(markup, /data-advanced-only/);
  assert.match(markup, /Harmony/);
});

test('V0.6.1 Color Set is a separate always-visible standard palette', () => {
  const markup = colorSetMarkup(initialEditorState);
  assert.match(markup, /COLOR SET/);
  assert.match(markup, /data-color-value=/);
  assert.match(markup, /Recent/);
  assert.match(markup, /Project/);
});

test('V0.6.1 Sub Tool remains dense and visibly exposes brush choices', () => {
  const markup = brushPanelMarkup('inking');
  assert.match(markup, /SUB TOOL/);
  assert.match(markup, /Pencil/);
  assert.match(markup, /Inking Pen/);
  assert.match(markup, /Marker/);
  assert.match(markup, /Soft Airbrush/);
});
