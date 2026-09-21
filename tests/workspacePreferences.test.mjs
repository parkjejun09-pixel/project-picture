import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultWorkspacePreferences,
  parseWorkspacePreferences,
  serializeWorkspacePreferences
} from '../.build/js/editor/workspacePreferences.js';

test('workspace preferences round-trip through versioned JSON', () => {
  const value = {
    handedness: 'left',
    canvasSurround: 'dark',
    uiDensity: 'compact',
    shortcutProfile: 'clip',
    collapsedPanels: ['navigator', 'history']
  };
  assert.deepEqual(parseWorkspacePreferences(serializeWorkspacePreferences(value)), value);
});

test('workspace preferences reject malformed or unsupported values safely', () => {
  assert.deepEqual(parseWorkspacePreferences('not json'), defaultWorkspacePreferences);
  const parsed = parseWorkspacePreferences(JSON.stringify({
    version: 1,
    handedness: 'center',
    canvasSurround: 'purple',
    uiDensity: 'huge',
    shortcutProfile: 'unknown',
    collapsedPanels: ['layers', 3, 'layers']
  }));
  assert.deepEqual(parsed, {
    ...defaultWorkspacePreferences,
    collapsedPanels: ['layers']
  });
});
