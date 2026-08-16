import db from './db.js';

export function getBoardWithColumnsAndTasks(boardId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const columns = db
    .prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC')
    .all(boardId);

  const taskStmt = db.prepare(
    'SELECT * FROM tasks WHERE column_id = ? ORDER BY datetime(created_at) DESC, id DESC'
  );

  const columnsWithTasks = columns.map((col) => ({
    ...col,
    tasks: taskStmt.all(col.id),
  }));

  return { ...board, columns: columnsWithTasks };
}

export function columnBelongsToBoard(columnId, boardId) {
  const row = db
    .prepare('SELECT 1 FROM columns WHERE id = ? AND board_id = ?')
    .get(columnId, boardId);
  return !!row;
}

export function createTask({ columnId, title, description, priority }) {
  const stmt = db.prepare(`
    INSERT INTO tasks (column_id, title, description, priority)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(columnId, title.trim(), description || null, priority || 'Medium');
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
}

export function getTask(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

export function updateTask(id, { title, description, priority }) {
  const existing = getTask(id);
  if (!existing) return null;

  const stmt = db.prepare(`
    UPDATE tasks SET title = ?, description = ?, priority = ?
    WHERE id = ?
  `);
  stmt.run(
    title !== undefined ? title.trim() : existing.title,
    description !== undefined ? description : existing.description,
    priority !== undefined ? priority : existing.priority,
    id
  );
  return getTask(id);
}

export function deleteTask(id) {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return info.changes > 0;
}

export function moveTask(id, columnId) {
  const existing = getTask(id);
  if (!existing) return null;
  db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(columnId, id);
  return getTask(id);
}
