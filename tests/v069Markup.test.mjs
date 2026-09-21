import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { commandBarMarkup } from '../.build/js/components/CommandBar.js';

test('V0.6.9 command bar exposes real project Open Save Save As separately from PNG export', () => {
  const html = commandBarMarkup({ brushSize: 18, opacity: 1, stabilizer: 30, zoom: 1, assistSnapEnabled: true });
  for (const action of ['open-project','save-project','save-as-project','export']) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /Open/);
  assert.match(html, /Save As/);
  assert.match(html, /Export PNG/);
  assert.doesNotMatch(html, /Save \/ Export/);
});

test('V0.6.9 App wires project controller, drawstudio codec and successful-save clean state', async () => {
  const source = await readFile('src/App.ts', 'utf8');
  assert.match(source, /ProjectController/);
  assert.match(source, /decodeProjectFile/);
  assert.match(source, /createProjectSnapshot/);
  assert.match(source, /projectDirty\.markClean\(\)/);
  assert.match(source, /importProjectDocument/);
});

test('V0.6.9 document tab exposes dirty marker and project status metadata hooks', async () => {
  const source = await readFile('src/components/DocumentBar.ts', 'utf8');
  assert.match(source, /updateDocumentBar/);
  assert.match(source, /data-document-name/);
  assert.match(source, /is-dirty/);
  assert.match(source, /data-document-meta/);
});

test('V0.6.9 recovery panel exposes explicit restore dismiss and recent-project surfaces', async () => {
  const source = await readFile('src/components/ProjectStatusPanel.ts', 'utf8');
  assert.match(source, /Restore Recovery/);
  assert.match(source, /Dismiss/);
  assert.match(source, /Recent Projects/);
  assert.match(source, /data-project-recovery/);
});

test('V0.6.9 App schedules dirty autosaves and loads valid recovery without auto-overwriting work', async () => {
  const source = await readFile('src/App.ts', 'utf8');
  assert.match(source, /AutosaveCoordinator/);
  assert.match(source, /autosave\.schedule/);
  assert.match(source, /loadValidRecovery/);
  assert.match(source, /restoreRecovery/);
  assert.match(source, /refreshProjectStatus/);
  assert.match(source, /clearRecovery/);
});
