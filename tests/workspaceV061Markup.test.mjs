import test from 'node:test';
import assert from 'node:assert/strict';
import { commandBarMarkup } from '../.build/js/components/CommandBar.js';
import { dockGroupMarkup } from '../.build/js/components/DockGroup.js';

test('V0.6.1 command bar exposes dense drawing controls without hiding core workflow', () => {
  const markup = commandBarMarkup({ brushSize: 24, opacity: 0.82, stabilizer: 35, zoom: 1 });
  for (const action of ['undo', 'redo', 'export', 'reset-view']) assert.match(markup, new RegExp(`data-action="${action}"`));
  assert.match(markup, /data-command="brush-size"/);
  assert.match(markup, /data-command="opacity"/);
  assert.match(markup, /data-command="stabilizer"/);
  assert.match(markup, /data-command="zoom"/);
  assert.match(markup, /Snap/);
});

test('V0.6.1 dock markup exposes connected primary and secondary palette regions', () => {
  assert.match(dockGroupMarkup('primary'), /class="dock-group primary-dock"/);
  assert.match(dockGroupMarkup('secondary'), /class="dock-group secondary-dock"/);
  assert.match(dockGroupMarkup('primary'), /data-dock="primary"/);
  assert.match(dockGroupMarkup('secondary'), /data-dock="secondary"/);
});
