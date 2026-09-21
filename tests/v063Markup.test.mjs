import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('V0.6.3 Properties exposes selection shapes, refine operations and transform modes', async () => {
  const source = await readFile('src/components/PropertiesPanel.ts','utf8');
  for (const token of ['selection-shape','ellipse','polygon','pen','selection-mode','selection-feather','selection-expand','selection-contract','selection-invert']) {
    assert.match(source, new RegExp(token));
  }
  for (const mode of ['free','perspective','distort','mesh']) assert.match(source, new RegExp(`transform-mode=.{0,4}${mode}`));
});

test('V0.6.3 Properties exposes real vector path editing actions', async () => {
  const source = await readFile('src/components/PropertiesPanel.ts','utf8');
  for (const action of ['vector-add-point','vector-delete-point','vector-handles','vector-simplify','vector-connect','vector-redraw']) {
    assert.match(source, new RegExp(action));
  }
});
