import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './testSetup.js'; // must run before db.js is imported anywhere

let app, db, seedTestBoard, boardId, todoId, doneId;

before(async () => {
  ({ default: app } = await import('../src/server.js'));
  ({ default: db } = await import('../src/db.js'));
  ({ seedTestBoard } = await import('./testSetup.js'));
});

beforeEach(() => {
  ({ boardId, todoId, doneId } = seedTestBoard(db));
});

// Minimal fetch-free request helper since we don't want an extra HTTP-client
// dependency just for tests: exercise the Express app with `app._router`
// via a lightweight in-process request using node's http.
import http from 'node:http';

function request(app) {
  return {
    async send(method, path, body) {
      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const { port } = server.address();
      const res = await fetch(`http://localhost:${port}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const status = res.status;
      let json = null;
      try {
        json = await res.json();
      } catch {
        /* no body, e.g. 204 */
      }
      await new Promise((resolve) => server.close(resolve));
      return { status, body: json };
    },
  };
}

test('creating a task with no title fails (400, and nothing is inserted)', async () => {
  const before = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;

  const res = await request(app).send('POST', '/api/tasks', {
    title: '   ',
    columnId: todoId,
  });

  assert.equal(res.status, 400);
  const after = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  assert.equal(after, before, 'no row should have been inserted');
});

test('moving a task updates its column_id (status)', async () => {
  const created = await request(app).send('POST', '/api/tasks', {
    title: 'Write tests',
    columnId: todoId,
    priority: 'Medium',
  });
  assert.equal(created.status, 201);
  const taskId = created.body.id;

  const moved = await request(app).send('PATCH', `/api/tasks/${taskId}/move`, {
    columnId: doneId,
  });

  assert.equal(moved.status, 200);
  assert.equal(moved.body.column_id, doneId);

  const row = db.prepare('SELECT column_id FROM tasks WHERE id = ?').get(taskId);
  assert.equal(row.column_id, doneId);
});
