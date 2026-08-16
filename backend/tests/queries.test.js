import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './testSetup.js';

let db, seedTestBoard, taskCountsPerColumn, tasksByPriority;
let boardId, todoId, doneId;

before(async () => {
  ({ default: db } = await import('../src/db.js'));
  ({ seedTestBoard } = await import('./testSetup.js'));
  ({ taskCountsPerColumn, tasksByPriority } = await import('../src/queries.js'));
});

beforeEach(() => {
  ({ boardId, todoId, doneId } = seedTestBoard(db));

  const insert = db.prepare(
    'INSERT INTO tasks (column_id, title, priority) VALUES (?, ?, ?)'
  );
  insert.run(todoId, 'Task A', 'High');
  insert.run(todoId, 'Task B', 'Low');
  insert.run(doneId, 'Task C', 'High');
});

test('taskCountsPerColumn returns correct counts for known seed data', () => {
  const counts = taskCountsPerColumn(boardId);
  const byName = Object.fromEntries(counts.map((c) => [c.column_name, c.task_count]));

  assert.equal(byName['To Do'], 2);
  assert.equal(byName['Done'], 1);
});

test('tasksByPriority returns only matching rows, newest first', () => {
  const highPriority = tasksByPriority(boardId, 'High');
  assert.equal(highPriority.length, 2);
  assert.ok(highPriority.every((t) => t.priority === 'High'));
  // most recently inserted High task ('Task C') should come first
  assert.equal(highPriority[0].title, 'Task C');
});
