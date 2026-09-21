import test from 'node:test';
import assert from 'node:assert/strict';
import { isPanelCollapsed, togglePanelId } from '../.build/js/components/panelBehavior.js';

test('panel collapse helper toggles stable unique panel ids', () => {
  assert.deepEqual(togglePanelId([], 'layers'), ['layers']);
  assert.deepEqual(togglePanelId(['layers', 'history'], 'layers'), ['history']);
  assert.deepEqual(togglePanelId(['layers'], 'layers'), []);
  assert.equal(isPanelCollapsed(['navigator'], 'navigator'), true);
  assert.equal(isPanelCollapsed(['navigator'], 'history'), false);
});
