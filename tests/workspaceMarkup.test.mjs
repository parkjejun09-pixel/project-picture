import test from 'node:test';
import assert from 'node:assert/strict';
import { documentBarMarkup } from '../.build/js/components/DocumentBar.js';
import { workspacePanelMarkup } from '../.build/js/components/WorkspacePanel.js';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';

test('V0.5 document bar exposes a professional document tab surface', () => {
  const markup = documentBarMarkup();
  assert.match(markup, /Untitled-1/);
  assert.match(markup, /data-action="new-document"/);
  assert.match(markup, /2048 × 1280/);
});

test('workspace settings expose handedness, surround, density and shortcut profiles', () => {
  const markup = workspacePanelMarkup(initialEditorState);
  assert.match(markup, /data-control="handedness"/);
  assert.match(markup, /data-control="canvas-surround"/);
  assert.match(markup, /data-control="ui-density"/);
  assert.match(markup, /data-control="shortcut-profile"/);
  assert.match(markup, /data-action="workspace-reset"/);
});
