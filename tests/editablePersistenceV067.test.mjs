import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditableLayerData } from '../.build/js/drawing/editableLayers.js';
import { addEditableLayer, createInitialLayerDocument, findLayerNode } from '../.build/js/drawing/layers.js';
import { cloneProjectDocumentDto, validateProjectDocumentDto } from '../.build/js/persistence/documentDto.js';
import {
  DRAWSTUDIO_FORMAT_VERSION,
  DRAWSTUDIO_MAGIC,
  decodeProjectFile,
  encodeProjectFile
} from '../.build/js/persistence/projectFormat.js';

const pixelRgba = 'AP8AgP8AAP8=';

function editableDocument() {
  let layers = createInitialLayerDocument();
  layers = addEditableLayer(layers, { ...createEditableLayerData('text', 64, 48), content: 'Unicode\n文字' });
  layers = addEditableLayer(layers, createEditableLayerData('balloon', 64, 48));
  layers = addEditableLayer(layers, createEditableLayerData('panel', 64, 48));
  layers = addEditableLayer(layers, createEditableLayerData('screen-tone', 64, 48));
  layers = addEditableLayer(layers, createEditableLayerData('manga-effect', 64, 48));
  layers = addEditableLayer(layers, createEditableLayerData('material', 64, 48, { width: 2, height: 1, rgba: pixelRgba }));
  return { layers, surfaces: [], vectors: [], selectionLayers: [] };
}

function project(document = editableDocument()) {
  return {
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion: '0.6.9',
    metadata: { title: 'Editable', createdAt: '2026-09-17T00:00:00.000Z', modifiedAt: '2026-09-17T00:01:00.000Z' },
    canvas: { width: 64, height: 48 },
    editor: {},
    document,
    extensions: { 'future.unknown': { retained: true } }
  };
}

test('V0.6.7 project v1 round-trips all editable kinds and exact material bytes', () => {
  const parsed = decodeProjectFile(encodeProjectFile(project()));
  assert.equal(parsed.formatVersion, 1);
  assert.deepEqual(parsed.extensions, { 'future.unknown': { retained: true } });
  assert.deepEqual(
    parsed.document.layers.nodes.slice(-6).map((node) => node.kind),
    ['text', 'balloon', 'panel', 'screen-tone', 'manga-effect', 'material']
  );
  assert.equal(parsed.document.layers.nodes.at(-1).asset.rgba, pixelRgba);
  assert.equal(parsed.document.layers.nodes.at(-6).content, 'Unicode\n文字');
});

test('V0.6.7 document cloning isolates nested editable material assets', () => {
  const source = editableDocument();
  const copy = cloneProjectDocumentDto(source);
  findLayerNode(copy.layers, 'material-6').asset.rgba = '/wAA/w==';
  assert.equal(findLayerNode(source.layers, 'material-6').asset.rgba, pixelRgba);
});

test('V0.6.7 project decoder rejects corrupt editable metadata and material bytes', () => {
  const invalidTone = project();
  invalidTone.document.layers.nodes.find((node) => node.kind === 'screen-tone').frequency = 0;
  assert.throws(() => decodeProjectFile(JSON.stringify(invalidTone)), /frequency/i);

  const invalidMaterial = project();
  invalidMaterial.document.layers.nodes.find((node) => node.kind === 'material').asset.rgba = '/wAA/w==';
  assert.throws(() => decodeProjectFile(JSON.stringify(invalidMaterial)), /byte length/i);
});

test('V0.6.7 validates a complete document before an importer can mutate canvas state', () => {
  const valid = editableDocument();
  const staged = validateProjectDocumentDto(valid, 64, 48);
  assert.notEqual(staged.layers, valid.layers);
  assert.notEqual(findLayerNode(staged.layers, 'material-6').asset, findLayerNode(valid.layers, 'material-6').asset);

  const corrupt = editableDocument();
  corrupt.layers.nodes.find((node) => node.kind === 'material').asset.rgba = 'bad';
  assert.throws(() => validateProjectDocumentDto(corrupt, 64, 48), /rgba|base64|byte length/i);
  assert.equal(findLayerNode(valid.layers, 'text-1').content, 'Unicode\n文字');
});

test('V0.6.7 document validation rejects unsafe editable node envelope metadata', () => {
  const corrupt = editableDocument();
  corrupt.layers.nodes.find((node) => node.kind === 'text').opacity = Number.POSITIVE_INFINITY;
  assert.throws(() => validateProjectDocumentDto(corrupt, 64, 48), /opacity/i);
});

test('V0.6.7 document validation rejects layer references that cannot be rendered safely', () => {
  const missingActive = editableDocument();
  missingActive.layers.activeLayerId = 'text-missing';
  assert.throws(() => validateProjectDocumentDto(missingActive, 64, 48), /active layer.*text-missing/i);

  const duplicateId = editableDocument();
  duplicateId.layers.nodes[1].id = duplicateId.layers.nodes[0].id;
  assert.throws(() => validateProjectDocumentDto(duplicateId, 64, 48), /duplicate layer id/i);

  const missingParent = editableDocument();
  missingParent.layers.nodes.at(-1).parentId = 'group-missing';
  assert.throws(() => validateProjectDocumentDto(missingParent, 64, 48), /parent.*group-missing/i);

  const nonGroupParent = editableDocument();
  nonGroupParent.layers.nodes.at(-1).parentId = nonGroupParent.layers.nodes[0].id;
  assert.throws(() => validateProjectDocumentDto(nonGroupParent, 64, 48), /parent.*group/i);

  const cyclicParents = editableDocument();
  cyclicParents.layers.nodes.push(
    { id: 'group-a', kind: 'group', name: 'A', parentId: 'group-b', visible: true, opacity: 1, blendMode: 'normal', locked: false, colorTag: 'none', expanded: true },
    { id: 'group-b', kind: 'group', name: 'B', parentId: 'group-a', visible: true, opacity: 1, blendMode: 'normal', locked: false, colorTag: 'none', expanded: true }
  );
  assert.throws(() => validateProjectDocumentDto(cyclicParents, 64, 48), /cycle/i);
});
