import express from 'express';
import cors from 'cors';
import db from './db.js';
import {
  getBoardWithColumnsAndTasks,
  columnBelongsToBoard,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
} from './taskRepository.js';
import { taskCountsPerColumn, tasksByPriority } from './queries.js';

const app = express();
app.use(cors());
app.use(express.json());

// spec explicitly rules out multi-board/multi-user, so just hardcode
// board #1 (the seed script creates it) instead of routing for boards
// that don't exist yet
const DEFAULT_BOARD_ID = 1;

function ensureBoardExists(req, res, next) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(DEFAULT_BOARD_ID);
  if (!board) {
    return res.status(500).json({
      error: 'No board found. Did you run `npm run seed` in the backend folder?',
    });
  }
  next();
}

// GET the whole board (columns + tasks), with optional ?priority= filter
// applied to the tasks returned per column.
app.get('/api/board', ensureBoardExists, (req, res) => {
  const board = getBoardWithColumnsAndTasks(DEFAULT_BOARD_ID);
  const { priority } = req.query;

  if (priority) {
    board.columns = board.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.priority === priority),
    }));
  }

  res.json(board);
});

// Query 1: task counts per column
app.get('/api/columns/counts', ensureBoardExists, (req, res) => {
  res.json(taskCountsPerColumn(DEFAULT_BOARD_ID));
});

// Query 2: tasks by priority, newest first
app.get('/api/tasks/by-priority/:priority', ensureBoardExists, (req, res) => {
  const { priority } = req.params;
  if (!['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({ error: 'priority must be Low, Medium, or High' });
  }
  res.json(tasksByPriority(DEFAULT_BOARD_ID, priority));
});

// Create a task
app.post('/api/tasks', ensureBoardExists, (req, res) => {
  const { title, description, priority, columnId } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
  }
  if (!columnId || !columnBelongsToBoard(columnId, DEFAULT_BOARD_ID)) {
    return res.status(400).json({ error: 'A valid columnId on this board is required.' });
  }

  const task = createTask({ columnId, title, description, priority });
  res.status(201).json(task);
});

// Edit a task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const existing = getTask(id);
  if (!existing) return res.status(404).json({ error: 'Task not found.' });

  const { title, description, priority } = req.body || {};

  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ error: 'Title cannot be empty.' });
  }
  if (priority !== undefined && !['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
  }

  const updated = updateTask(id, { title, description, priority });
  res.json(updated);
});

// Move a task to a different column
app.patch('/api/tasks/:id/move', ensureBoardExists, (req, res) => {
  const { id } = req.params;
  const { columnId } = req.body || {};

  const existing = getTask(id);
  if (!existing) return res.status(404).json({ error: 'Task not found.' });
  if (!columnId || !columnBelongsToBoard(columnId, DEFAULT_BOARD_ID)) {
    return res.status(400).json({ error: 'A valid columnId on this board is required.' });
  }

  const updated = moveTask(id, columnId);
  res.json(updated);
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const existing = getTask(id);
  if (!existing) return res.status(404).json({ error: 'Task not found.' });

  deleteTask(id);
  res.status(204).send();
});

// catch-all so an unexpected error doesn't just crash into a blank response
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TaskFlow API running on http://localhost:${PORT}`));
}

export default app;
