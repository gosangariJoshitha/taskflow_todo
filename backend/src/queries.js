// the two "real" queries the assignment asks for - raw SQL, not just
// db.all() + filtering in JS
import db from './db.js';

// count of tasks per column for a board
// left join so a column with 0 tasks still shows up instead of disappearing
export function taskCountsPerColumn(boardId) {
  const stmt = db.prepare(`
    SELECT
      c.id          AS column_id,
      c.name        AS column_name,
      c.position    AS position,
      COUNT(t.id)   AS task_count
    FROM columns c
    LEFT JOIN tasks t ON t.column_id = c.id
    WHERE c.board_id = ?
    GROUP BY c.id, c.name, c.position
    ORDER BY c.position ASC
  `);
  return stmt.all(boardId);
}

// tasks with a given priority, newest first - joined with column name
// so the frontend doesn't need a second call just to show which column
export function tasksByPriority(boardId, priority) {
  const stmt = db.prepare(`
    SELECT
      t.id, t.title, t.description, t.priority, t.created_at,
      t.column_id, c.name AS column_name
    FROM tasks t
    JOIN columns c ON c.id = t.column_id
    WHERE c.board_id = ? AND t.priority = ?
    ORDER BY datetime(t.created_at) DESC, t.id DESC
  `);
  return stmt.all(boardId, priority);
}
