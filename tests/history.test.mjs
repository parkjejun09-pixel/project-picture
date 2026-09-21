import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoryStack } from '../.build/js/drawing/history.js';

test('HistoryStack walks backward and forward through pushed states', () => {
  const history = new HistoryStack(5);
  history.push('blank');
  history.push('stroke-1');
  history.push('stroke-2');
  assert.equal(history.undo(), 'stroke-1');
  assert.equal(history.undo(), 'blank');
  assert.equal(history.redo(), 'stroke-1');
});

test('HistoryStack discards redo branch after a new push', () => {
  const history = new HistoryStack(5);
  history.push('a');
  history.push('b');
  history.undo();
  history.push('c');
  assert.equal(history.canRedo, false);
  assert.equal(history.current, 'c');
});

test('HistoryStack enforces its maximum number of states', () => {
  const history = new HistoryStack(3);
  history.push(1);
  history.push(2);
  history.push(3);
  history.push(4);
  assert.equal(history.undo(), 3);
  assert.equal(history.undo(), 2);
  assert.equal(history.canUndo, false);
});
