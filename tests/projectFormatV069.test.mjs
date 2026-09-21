import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bytesToBase64,
  base64ToBytes,
  encodeProjectFile,
  decodeProjectFile,
  DRAWSTUDIO_MAGIC,
  DRAWSTUDIO_FORMAT_VERSION
} from '../.build/js/persistence/projectFormat.js';

test('V0.6.9 byte codec round-trips arbitrary bytes', () => {
  const input = new Uint8Array([0, 1, 2, 127, 128, 200, 254, 255]);
  const encoded = bytesToBase64(input);
  assert.equal(typeof encoded, 'string');
  assert.deepEqual([...base64ToBytes(encoded)], [...input]);
});

test('V0.6.9 project format round-trips a valid v1 project and preserves extensions', () => {
  const project = {
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion: '0.6.9',
    metadata: {
      title: 'Round Trip',
      createdAt: '2026-09-17T00:00:00.000Z',
      modifiedAt: '2026-09-17T00:01:00.000Z'
    },
    canvas: { width: 640, height: 480 },
    editor: { color: '#112233' },
    document: {
      layers: {
        nodes: [{ id: 'background', name: 'Background', kind: 'background', parentId: null, visible: true, opacity: 1, blendMode: 'normal', locked: true, colorTag: 'none', alphaLock: true, clipping: false, hasMask: false, role: 'normal' }],
        activeLayerId: 'background', activeTarget: 'content', nextRasterNumber: 1, nextVectorNumber: 1, nextGroupNumber: 1, nextSpecialNumber: 1
      },
      surfaces: [],
      vectors: [],
      selectionLayers: []
    },
    extensions: {
      'future.animation': { fps: 12 },
      'future.smartEffects': [{ id: 'fx-1' }]
    }
  };

  const text = encodeProjectFile(project);
  const parsed = decodeProjectFile(text);
  assert.equal(parsed.magic, DRAWSTUDIO_MAGIC);
  assert.equal(parsed.formatVersion, DRAWSTUDIO_FORMAT_VERSION);
  assert.equal(parsed.metadata.title, 'Round Trip');
  assert.deepEqual(parsed.extensions, project.extensions);
});

test('V0.6.9 project decoder rejects malformed magic and unsupported future versions', () => {
  assert.throws(() => decodeProjectFile(JSON.stringify({ magic: 'wrong', formatVersion: 1 })), /magic/i);
  assert.throws(() => decodeProjectFile(JSON.stringify({
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION + 1,
    metadata: {}, canvas: {}, editor: {}, document: {}, extensions: {}
  })), /version/i);
});

test('V0.6.9 project decoder rejects invalid JSON and invalid canvas sizes', () => {
  assert.throws(() => decodeProjectFile('{nope'), /json/i);
  assert.throws(() => decodeProjectFile(JSON.stringify({
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion: '0.6.9',
    metadata: { title: 'Bad', createdAt: '', modifiedAt: '' },
    canvas: { width: 0, height: -1 },
    editor: {},
    document: { layers: {}, surfaces: [], vectors: [], selectionLayers: [] },
    extensions: {}
  })), /canvas/i);
});
