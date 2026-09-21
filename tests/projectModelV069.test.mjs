import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';
import { ProjectDirtyTracker, createProjectSnapshot } from '../.build/js/persistence/projectModel.js';
import { DRAWSTUDIO_MAGIC, DRAWSTUDIO_FORMAT_VERSION } from '../.build/js/persistence/projectFormat.js';

test('V0.6.9 dirty tracker separates content revisions from saved clean revision', () => {
  const tracker = new ProjectDirtyTracker();
  assert.equal(tracker.dirty, false);
  assert.equal(tracker.revision, 0);
  tracker.markDirty();
  tracker.markDirty();
  assert.equal(tracker.dirty, true);
  assert.equal(tracker.revision, 2);
  tracker.markClean();
  assert.equal(tracker.dirty, false);
  tracker.markDirty();
  assert.equal(tracker.dirty, true);
  tracker.resetClean();
  assert.equal(tracker.dirty, false);
  assert.equal(tracker.revision, 0);
});

test('V0.6.9 project model assembles editor, canvas, document and extension metadata', () => {
  const document = {
    layers: { nodes: [], activeLayerId: 'background', activeTarget: 'content', nextRasterNumber: 1, nextVectorNumber: 1, nextGroupNumber: 1, nextSpecialNumber: 1 },
    surfaces: [], vectors: [], selectionLayers: []
  };
  const project = createProjectSnapshot({
    title: 'My Drawing',
    createdAt: '2026-09-16T00:00:00.000Z',
    modifiedAt: '2026-09-17T04:00:00.000Z',
    editorState: { ...initialEditorState, color: '#123456' },
    document,
    canvas: { width: 1280, height: 800 },
    extensions: { 'recovered.future': { ok: true } }
  });
  assert.equal(project.magic, DRAWSTUDIO_MAGIC);
  assert.equal(project.formatVersion, DRAWSTUDIO_FORMAT_VERSION);
  assert.equal(project.appVersion, '0.6.9');
  assert.equal(project.metadata.title, 'My Drawing');
  assert.equal(project.metadata.createdAt, '2026-09-16T00:00:00.000Z');
  assert.equal(project.metadata.modifiedAt, '2026-09-17T04:00:00.000Z');
  assert.equal(project.canvas.width, 1280);
  assert.equal(project.editor.color, '#123456');
  assert.deepEqual(project.extensions, { 'recovered.future': { ok: true } });
});

test('V0.6.9 App marks document history mutations dirty without treating pan and zoom callbacks as content edits', async () => {
  const source = await readFile('src/App.ts', 'utf8');
  assert.match(source, /ProjectDirtyTracker/);
  assert.match(source, /projectDirty\.markDirty\(\)/);
  const panLine = source.match(/onPanChange:[^\n]+/)?.[0] ?? '';
  const zoomLine = source.match(/onZoomChange:[^\n]+/)?.[0] ?? '';
  assert.doesNotMatch(panLine, /markDirty/);
  assert.doesNotMatch(zoomLine, /markDirty/);
});
