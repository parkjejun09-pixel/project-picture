import test from 'node:test';
import assert from 'node:assert/strict';
import { brushPanelMarkup, pressureResponseLabel } from '../.build/js/components/brushPanelMarkup.js';

test('brushPanelMarkup exposes all V0.2 presets and advanced dynamics controls', () => {
  const markup = brushPanelMarkup('inking');
  for (const id of ['pencil', 'inking', 'marker', 'airbrush']) {
    assert.match(markup, new RegExp(`data-preset="${id}"`));
  }
  assert.match(markup, /data-control="stabilizer"/);
  assert.match(markup, /data-control="pressure-response"/);
  assert.match(markup, /data-control="tilt-influence"/);
  assert.match(markup, /data-advanced-only/);
});

test('pressureResponseLabel names firm, linear and soft response', () => {
  assert.equal(pressureResponseLabel(-0.8), 'Firm');
  assert.equal(pressureResponseLabel(0), 'Linear');
  assert.equal(pressureResponseLabel(0.7), 'Soft');
});
