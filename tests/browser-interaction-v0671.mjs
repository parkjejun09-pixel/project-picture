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

  const favorite = page.locator('[data-brush-favorite]').first(); await favorite.click();
  await page.locator('[data-brush-filter="favorites"]').click();
  assert.equal(await page.locator('[data-preset]:visible').count(), 1);
  await page.locator('[data-preset]:visible').click(); await page.locator('[data-brush-filter="recent"]').click();
  assert.ok(await page.locator('[data-preset]:visible').count() >= 1);
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
