import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectController } from '../.build/js/persistence/projectController.js';

function handle(name, writes) {
  return { name, writeText: async (text) => { writes.push({ name, text }); } };
}

test('V0.6.9 controller opens direct files and reuses their writable handle for Save', async () => {
  const writes = [];
  const existing = handle('art.drawstudio', writes);
  const io = {
    directSupported: true,
    openDirect: async () => ({ name: existing.name, text: '{"ok":1}', handle: existing }),
    createDirectHandle: async () => { throw new Error('Save As should not be used'); },
    openFallback: async () => null,
    downloadFallback: () => { throw new Error('Fallback should not be used'); }
  };
  const controller = new ProjectController(io);
  const opened = await controller.open();
  assert.equal(opened.name, 'art.drawstudio');
  const saved = await controller.save('updated', 'fallback.drawstudio');
  assert.deepEqual(writes, [{ name: 'art.drawstudio', text: 'updated' }]);
  assert.deepEqual(saved, { kind: 'direct', name: 'art.drawstudio' });
});

test('V0.6.9 Save without a handle performs direct Save As when supported', async () => {
  const writes = [];
  const io = {
    directSupported: true,
    openDirect: async () => null,
    createDirectHandle: async (suggestedName) => handle(suggestedName, writes),
    openFallback: async () => null,
    downloadFallback: () => { throw new Error('Fallback should not be used'); }
  };
  const controller = new ProjectController(io);
  const result = await controller.save('payload', 'untitled.drawstudio');
  assert.deepEqual(result, { kind: 'direct', name: 'untitled.drawstudio' });
  assert.deepEqual(writes, [{ name: 'untitled.drawstudio', text: 'payload' }]);
});

test('V0.6.9 fallback Open and Save As use browser upload/download adapters', async () => {
  const downloads = [];
  const io = {
    directSupported: false,
    openDirect: async () => null,
    createDirectHandle: async () => null,
    openFallback: async () => ({ name: 'fallback.drawstudio', text: 'from-upload' }),
    downloadFallback: (name, text) => downloads.push({ name, text })
  };
  const controller = new ProjectController(io);
  const opened = await controller.open();
  assert.equal(opened.text, 'from-upload');
  const result = await controller.saveAs('downloaded', 'fallback.drawstudio');
  assert.deepEqual(result, { kind: 'download', name: 'fallback.drawstudio' });
  assert.deepEqual(downloads, [{ name: 'fallback.drawstudio', text: 'downloaded' }]);
});

test('V0.6.9 controller preserves cancellation without inventing a save result', async () => {
  const io = {
    directSupported: true,
    openDirect: async () => null,
    createDirectHandle: async () => null,
    openFallback: async () => null,
    downloadFallback: () => {}
  };
  const controller = new ProjectController(io);
  assert.equal(await controller.open(), null);
  assert.equal(await controller.saveAs('x', 'x.drawstudio'), null);
});
