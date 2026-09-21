import test from 'node:test';
import assert from 'node:assert/strict';
import { brushPanelMarkup } from '../.build/js/components/brushPanelMarkup.js';
import { BrushStudioPanel } from '../.build/js/components/BrushStudioPanel.js';
import { initialEditorState } from '../.build/js/editor/editorReducer.js';
import { readFile } from 'node:fs/promises';

test('V0.6.4 sub tool exposes expanded painting presets and brush search',()=>{
  const html=brushPanelMarkup('inking');
  for (const token of ['Watercolor','Oil Paint','Chalk','Spray','data-brush-search']) assert.ok(html.includes(token),token);
});
test('V0.6.4 toolbar exposes smudge blur and mix tools',async()=>{
  const source=await readFile('src/components/ToolBar.ts','utf8'); for(const token of ['smudge','blur','mix']) assert.match(source,new RegExp(`tool: ['\"]${token}['\"]`));
});
test('V0.6.4 Brush Studio source exposes advanced dynamics',()=>{
  const source=BrushStudioPanel.toString(); for(const token of ['flow','velocity-size','scatter','size-jitter','angle-jitter','color-jitter','grain','taper']) assert.ok(source.includes(token),token);
  assert.ok(initialEditorState.flow>0);
});

test('V0.6.4 canvas integrates advanced dynamics and pixel blend tools', async()=>{
  const source=await readFile('src/components/DrawingCanvas.ts','utf8');
  for(const token of ['buildAdvancedDab','paintPixelTool','blurPixels','smudgePixels','mixHexColors']) assert.ok(source.includes(token),token);
});

test('V0.6.4 Brush Studio exposes real custom preset file controls', async()=>{
  const source=await readFile('src/components/BrushStudioPanel.ts','utf8');
  assert.match(source,/Export \.drawbrush/);
  assert.match(source,/Import \.drawbrush/);
  assert.match(source,/serializeCustomBrush/);
  assert.match(source,/parseCustomBrush/);
});
