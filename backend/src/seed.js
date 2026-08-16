// seeds one demo board with 3 columns + some tasks
// safe to re-run, wipes existing data first
import db from './db.js';

function seed() {
  const wipe = db.transaction(() => {
    db.exec('DELETE FROM tasks; DELETE FROM columns; DELETE FROM boards;');
    // reset autoincrement counters so ids are predictable on a fresh seed
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks','columns','boards');");
  });
  wipe();

  const insertBoard = db.prepare('INSERT INTO boards (name) VALUES (?)');
  const boardId = insertBoard.run('Demo Team Board').lastInsertRowid;

  const insertColumn = db.prepare(
    'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)'
  );
  const todoId = insertColumn.run(boardId, 'To Do', 0).lastInsertRowid;
  const inProgressId = insertColumn.run(boardId, 'In Progress', 1).lastInsertRowid;
  const doneId = insertColumn.run(boardId, 'Done', 2).lastInsertRowid;

  const insertTask = db.prepare(`
    INSERT INTO tasks (column_id, title, description, priority)
    VALUES (?, ?, ?, ?)
  `);

  const tasks = [
    [todoId, 'Set up project repo', 'Init git, add README', 'Low'],
    [todoId, 'Design database schema', 'Boards, columns, tasks', 'High'],
    [todoId, 'Write API spec', null, 'Medium'],
    [inProgressId, 'Build task board UI', 'Columns + cards layout', 'High'],
    [inProgressId, 'Wire up create task form', null, 'Medium'],
    [doneId, 'Project kickoff meeting', 'Aligned on scope', 'Low'],
    [doneId, 'Repo access for team', null, 'Medium'],
  ];

  for (const t of tasks) insertTask.run(...t);

  console.log(`Seeded board #${boardId} with ${tasks.length} tasks across 3 columns.`);
}

seed();
