// Points TASKFLOW_DB_PATH at a throwaway file before any test imports db.js,
// so tests never touch the real taskflow.db used by `npm run dev`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, 'test.db');

if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
process.env.TASKFLOW_DB_PATH = TEST_DB_PATH;
process.env.NODE_ENV = 'test';

export function seedTestBoard(db) {
  db.exec('DELETE FROM tasks; DELETE FROM columns; DELETE FROM boards;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks','columns','boards');");

  const boardId = db.prepare('INSERT INTO boards (name) VALUES (?)').run('Test Board').lastInsertRowid;
  const todoId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)')
    .run(boardId, 'To Do', 0).lastInsertRowid;
  const doneId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)')
    .run(boardId, 'Done', 1).lastInsertRowid;

  return { boardId, todoId, doneId };
}

export { TEST_DB_PATH };
