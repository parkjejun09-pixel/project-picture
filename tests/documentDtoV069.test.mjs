import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  serializeImageBytes,
  deserializeImageBytes,
  serializeSelectionBytes,
  deserializeSelectionBytes,
  cloneProjectDocumentDto
} from '../.build/js/persistence/documentDto.js';

test('V0.6.9 image DTO round-trips exact RGBA bytes and validates dimensions', () => {
  const bytes = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128]);
  const encoded = serializeImageBytes(2, 1, bytes);
  assert.equal(encoded.width, 2);
  assert.equal(encoded.height, 1);
  const decoded = deserializeImageBytes(encoded);
  assert.deepEqual([...decoded.data], [...bytes]);
  assert.throws(() => serializeImageBytes(2, 2, bytes), /length/i);
});

test('V0.6.9 selection mask DTO preserves 0, 1 and 255 mask conventions', () => {
  const mask = new Uint8Array([0, 1, 255, 12]);
  const encoded = serializeSelectionBytes(mask);
  assert.deepEqual([...deserializeSelectionBytes(encoded, 4)], [...mask]);
  assert.throws(() => deserializeSelectionBytes(encoded, 5), /length/i);
});

test('V0.6.9 project document clone does not alias vector points or layer nodes', () => {
  const dto = {
    layers: {
      nodes: [{ id: 'vector-1', kind: 'vector', name: 'Vector', parentId: null, visible: true, opacity: 1, blendMode: 'normal', locked: false, colorTag: 'none' }],
      activeLayerId: 'vector-1', activeTarget: 'content', nextRasterNumber: 2, nextVectorNumber: 2, nextGroupNumber: 1, nextSpecialNumber: 1
    },
    surfaces: [],
    vectors: [{ id: 'vector-1', strokes: [{ id: 'stroke-1', color: '#000000', size: 2, opacity: 1, points: [{ x: 1, y: 2, pressure: 1, tiltX: 0, tiltY: 0 }] }] }],
    selectionLayers: []
  };
  const copy = cloneProjectDocumentDto(dto);
  copy.layers.nodes[0].name = 'Changed';
  copy.vectors[0].strokes[0].points[0].x = 99;
  assert.equal(dto.layers.nodes[0].name, 'Vector');
  assert.equal(dto.vectors[0].strokes[0].points[0].x, 1);
});

test('V0.6.9 DrawingCanvas exposes explicit project export/import bridge and resets history', async () => {
  const source = await readFile('src/components/DrawingCanvas.ts', 'utf8');
  assert.match(source, /exportProjectDocument\(\)/);
  assert.match(source, /importProjectDocument\(/);
  assert.match(source, /resizeProjectCanvas\(/);
  assert.match(source, /this\.history\.clear\(\)/);
  assert.match(source, /this\.history\.push\(this\.snapshot\(\)\)/);
});
