import test from 'node:test';
import assert from 'node:assert/strict';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';
import { serializeEditorState, deserializeEditorState } from '../.build/js/persistence/editorStateDto.js';

test('V0.6.9 editor state codec round-trips brush texture bytes and nested state without aliasing', () => {
  const source = {
    ...initialEditorState,
    color: '#123456',
    zoom: 2.25,
    pan: { x: 40, y: -15 },
    recentColors: ['#123456', '#ABCDEF'],
    perspectiveVanishingPoints: [{ x: .1, y: .4 }, { x: .9, y: .4 }],
    brushTextureMap: { width: 2, height: 2, data: new Uint8Array([0, 64, 128, 255]) }
  };
  const encoded = serializeEditorState(source);
  assert.equal(typeof encoded.brushTextureMap.data, 'string');
  const restored = deserializeEditorState(encoded);
  assert.equal(restored.color, '#123456');
  assert.equal(restored.zoom, 2.25);
  assert.deepEqual(restored.pan, { x: 40, y: -15 });
  assert.deepEqual([...restored.brushTextureMap.data], [0, 64, 128, 255]);
  restored.pan.x = 999;
  restored.recentColors.push('#000000');
  assert.equal(source.pan.x, 40);
  assert.equal(source.recentColors.length, 2);
});

test('V0.6.9 editor state decoder falls back safely for malformed scalar and enum values', () => {
  const restored = deserializeEditorState({
    tool: 'explode',
    mode: 'ultra',
    brushSize: 'huge',
    fillAntialias: 'yes',
    zoom: Number.NaN,
    pan: { x: 'bad', y: 12 },
    color: '#GGGGGG'
  });
  assert.equal(restored.tool, initialEditorState.tool);
  assert.equal(restored.mode, initialEditorState.mode);
  assert.equal(restored.brushSize, initialEditorState.brushSize);
  assert.equal(restored.fillAntialias, initialEditorState.fillAntialias);
  assert.equal(restored.zoom, initialEditorState.zoom);
  assert.deepEqual(restored.pan, initialEditorState.pan);
  assert.equal(restored.color, initialEditorState.color);
});

test('V0.6.9 malformed brush texture maps are discarded without rejecting the project', () => {
  const restored = deserializeEditorState({
    brushTextureMap: { width: 2, height: 2, data: 'AAAA' }
  });
  assert.equal(restored.brushTextureMap, null);
});
