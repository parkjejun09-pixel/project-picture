import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('V0.6.2 tool strip exposes all core expansion tools', async () => {
  const source = await readFile('src/components/ToolBar.ts','utf8');
  for (const tool of ['eyedropper','gradient','shape','magic-wand','lasso','text']) {
    assert.match(source, new RegExp(`tool: ['\"]${tool}['\"]`));
  }
});

test('V0.6.2 includes a real reference image dock palette', async () => {
  const app = await readFile('src/App.ts','utf8');
  const panel = await readFile('src/components/ReferencePanel.ts','utf8');
  assert.match(app,/ReferencePanel/);
  assert.match(panel,/type="file"/);
  assert.match(panel,/accept="image\/\*"/);
  assert.match(panel,/reference-preview/);
});
