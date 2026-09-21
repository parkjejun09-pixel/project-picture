import test from 'node:test';
import assert from 'node:assert/strict';
import { appendHistoryEntry } from '../.build/js/components/historyModel.js';

test('history operation log keeps newest entries and a bounded list', () => {
  let entries = [];
  for (let index = 0; index < 12; index += 1) entries = appendHistoryEntry(entries, `Step ${index}`, 8);
  assert.equal(entries.length, 8);
  assert.equal(entries[0], 'Step 11');
  assert.equal(entries.at(-1), 'Step 4');
});
