import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { browserHarness } from './browserHarness.mjs';

const h = await browserHarness({ exposeApp: true });
const { page } = h;
try {
  for (const name of ['file','edit','layer','select','filter','view','window','help']) {
    await page.locator(`[data-menu="${name}"]`).click();
    assert.equal(await page.locator('[data-menu-popup]').isVisible(), true, `${name} opens a menu`);
    assert.ok(await page.locator('[data-menu-popup] [role="menuitem"]').count() > 0, `${name} has a truthful menu item`);
  }

  await page.locator('[data-menu="layer"]').click();
  const layers = await page.locator('.layer-row').count();
  await page.locator('[data-command="layer.addRaster"]').click();
  assert.equal(await page.locator('.layer-row').count(), layers + 1);
  await page.locator('[data-menu="edit"]').click(); await page.locator('[data-command="edit.undo"]').click();
  assert.equal(await page.locator('.layer-row').count(), layers, 'Edit > Undo changes document history');
  await page.locator('[data-menu="edit"]').click(); await page.locator('[data-command="edit.redo"]').click();
  assert.equal(await page.locator('.layer-row').count(), layers + 1, 'Edit > Redo changes document history');

  await page.locator('[data-menu="select"]').click(); await page.locator('[data-command="select.all"]').click();
  assert.ok(await page.evaluate(() => window.testApp.drawingCanvas.selectionInfo.rect), 'Select > Select all creates a selection');
  await page.locator('[data-menu="select"]').click(); await page.locator('[data-command="select.clear"]').click();
  assert.equal(await page.evaluate(() => window.testApp.drawingCanvas.selectionInfo.rect), null, 'Select > Clear selection clears it');

  await page.evaluate(() => window.testApp.dispatch({type:'zoom/set',value:2}));
  await page.locator('[data-menu="view"]').click(); await page.locator('[data-command="view.fitCanvas"]').click();
  assert.equal(await page.evaluate(() => window.testApp.state.zoom), 1, 'View > Fit canvas resets zoom');
  await page.evaluate(() => { window.testApp.dispatch({type:'zoom/set',value:2}); window.testApp.dispatch({type:'pan/set',x:20,y:30}); });
  await page.locator('[data-menu="view"]').click(); await page.locator('[data-command="view.actualSize"]').click();
  assert.deepEqual(await page.evaluate(() => ({zoom:window.testApp.state.zoom,pan:window.testApp.state.pan})), {zoom:1,pan:{x:0,y:0}}, 'View > Actual size resets zoom and pan');

  const wheel = page.locator('[data-control="hue-wheel"]');
  const box = await wheel.boundingBox(); assert.ok(box);
  const points = [[.5,0,'#ff0000'],[1,.5,'#80ff00'],[.5,1,'#00ffff'],[0,.5,'#8000ff']];
  for (const [x,y,expected] of points) {
    await page.evaluate(() => window.testApp.dispatch({type:'color/preview',value:'#ff0000'}));
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    assert.equal((await page.locator('[data-current-color-label]').innerText()).toLowerCase(), expected);
  }
  const before = await page.evaluate(() => window.testApp.state.recentColors.length);
  await page.mouse.move(box.x + box.width / 2, box.y + 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, {steps:8});
  assert.equal(await page.evaluate(() => window.testApp.state.recentColors.length), before, 'preview frames do not enter Recent Colors');
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.testApp.state.recentColors.length), Math.min(12, before + 1), 'pointer release commits once');

  const cancelStart = await page.evaluate(() => window.testApp.state.color);
  const recentBeforeCancel = await page.evaluate(() => window.testApp.state.recentColors.slice());
  await page.mouse.move(box.x + box.width / 2, box.y + 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  assert.notEqual(await page.evaluate(() => window.testApp.state.color), cancelStart, 'cancel test applies a preview first');
  await wheel.dispatchEvent('pointercancel', {pointerId:1}); await page.mouse.up();
  assert.equal(await page.evaluate(() => window.testApp.state.color), cancelStart, 'pointercancel restores the drag-start color');
  assert.deepEqual(await page.evaluate(() => window.testApp.state.recentColors), recentBeforeCancel, 'pointercancel does not commit to Recent Colors');

  const favorite = page.locator('[data-brush-favorite]').first(); await favorite.click();
  await page.locator('[data-brush-filter="favorites"]').click();
  assert.equal(await page.locator('[data-preset]:visible').count(), 1);
  const favoriteName=(await page.locator('[data-preset]:visible strong').innerText()).toLowerCase();
  await page.locator('[data-brush-search]').fill('no matching brush'); assert.equal(await page.locator('[data-preset]:visible').count(),0,'Search + Favorites intersects both conditions');
  await page.locator('[data-brush-search]').fill(favoriteName); assert.equal(await page.locator('[data-preset]:visible').count(),1,'Search + Favorites preserves matching favorite');
  await page.locator('[data-brush-search]').fill(''); await page.locator('[data-preset]:visible').click();
  await page.locator('[data-brush-filter="all"]').click(); const second=page.locator('[data-preset]').nth(1); const recentName=(await second.locator('strong').innerText()).toLowerCase(); await second.click();
  await page.locator('[data-brush-filter="recent"]').click(); assert.equal(await page.locator('[data-preset]:visible').count(),2);
  await page.locator('[data-brush-search]').fill(recentName); assert.equal(await page.locator('[data-preset]:visible').count(),1,'Search + Recent preserves matching recent brush');
  await page.locator('[data-brush-search]').fill('no matching brush'); assert.equal(await page.locator('[data-preset]:visible').count(),0,'Search + Recent intersects both conditions');
  assert.equal(await page.locator('.subtool-footer button').isDisabled(), true, 'unsupported Add Brush is visibly disabled');

  await page.locator('[data-control="shortcut-profile"]').selectOption('clip');
  await page.keyboard.press('e'); await page.keyboard.press('p');
  assert.equal(await page.locator('.editor-shell').getAttribute('data-tool'), 'brush');
  assert.match(await page.locator('[data-tool="brush"]').getAttribute('title'), /\(P\)$/);

  await mkdir(path.resolve('test-results/v0671'), {recursive:true});
  await page.screenshot({path:path.resolve('test-results/v0671/interaction-desktop.png'), fullPage:true});
  assert.deepEqual(h.errors, []);
  console.log('PASS V0.6.7.1 interaction stability matrix');
} finally { await h.close(); }
