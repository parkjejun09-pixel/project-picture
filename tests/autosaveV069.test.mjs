import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AutosaveCoordinator,
  MemoryAutosaveStore,
  loadValidRecovery
} from '../.build/js/persistence/autosaveStore.js';
import { DRAWSTUDIO_FORMAT_VERSION, DRAWSTUDIO_MAGIC, encodeProjectFile } from '../.build/js/persistence/projectFormat.js';

function projectText(title = 'Recovery') {
  return encodeProjectFile({
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion: '0.6.9',
    metadata: { title, createdAt: '2026-09-17T00:00:00.000Z', modifiedAt: '2026-09-17T00:01:00.000Z' },
    canvas: { width: 10, height: 10 },
    editor: {},
    document: { layers: {}, surfaces: [], vectors: [], selectionLayers: [] },
    extensions: {}
  });
}

test('V0.6.9 memory autosave store keeps latest checkpoint and recent projects newest-first', async () => {
  const store = new MemoryAutosaveStore();
  await store.saveRecovery({ id: 'latest', title: 'A', savedAt: '2026-09-17T00:00:00.000Z', revision: 1, projectText: projectText('A') });
  await store.saveRecovery({ id: 'latest', title: 'B', savedAt: '2026-09-17T00:02:00.000Z', revision: 2, projectText: projectText('B') });
  assert.equal((await store.getRecovery())?.title, 'B');

  await store.recordRecent({ name: 'old.drawstudio', updatedAt: '2026-09-17T00:00:00.000Z', source: 'upload' });
  await store.recordRecent({ name: 'new.drawstudio', updatedAt: '2026-09-17T00:03:00.000Z', source: 'direct' });
  const recent = await store.listRecent(5);
  assert.deepEqual(recent.map((item) => item.name), ['new.drawstudio', 'old.drawstudio']);
});

test('V0.6.9 autosave coordinator debounces older revisions and writes only the newest pending snapshot', async () => {
  const store = new MemoryAutosaveStore();
  const jobs = new Map();
  let next = 1;
  const schedule = (callback) => { const id = next++; jobs.set(id, callback); return id; };
  const cancel = (id) => jobs.delete(id);
  const coordinator = new AutosaveCoordinator(store, { delayMs: 500, schedule, cancel, now: () => '2026-09-17T00:05:00.000Z' });

  coordinator.schedule({ revision: 1, title: 'First', createProjectText: () => projectText('First') });
  coordinator.schedule({ revision: 2, title: 'Second', createProjectText: () => projectText('Second') });
  assert.equal(jobs.size, 1);
  for (const callback of [...jobs.values()]) await callback();
  const checkpoint = await store.getRecovery();
  assert.equal(checkpoint.revision, 2);
  assert.equal(checkpoint.title, 'Second');
});

test('V0.6.9 recovery loader fails closed for corrupt project payloads', async () => {
  const store = new MemoryAutosaveStore();
  await store.saveRecovery({ id: 'latest', title: 'Broken', savedAt: '2026-09-17T00:00:00.000Z', revision: 3, projectText: '{broken' });
  assert.equal(await loadValidRecovery(store), null);
  await store.saveRecovery({ id: 'latest', title: 'Good', savedAt: '2026-09-17T00:00:00.000Z', revision: 4, projectText: projectText('Good') });
  assert.equal((await loadValidRecovery(store))?.project.metadata.title, 'Good');
});

test('V0.6.9 successful explicit save can clear stale recovery', async () => {
  const store = new MemoryAutosaveStore();
  await store.saveRecovery({ id: 'latest', title: 'A', savedAt: '2026-09-17T00:00:00.000Z', revision: 1, projectText: projectText('A') });
  await store.clearRecovery();
  assert.equal(await store.getRecovery(), null);
});
