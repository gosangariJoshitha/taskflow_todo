import { useEffect, useState, useCallback } from 'react';
import Column from './components/Column.jsx';
import TaskForm from './components/TaskForm.jsx';
import * as api from './api.js';

export default function App() {
  const [board, setBoard] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState(null); // { mode: 'create'|'edit', task?, columnId? }

  const loadBoard = useCallback(async (priority) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchBoard(priority || undefined);
      setBoard(data);
    } catch (err) {
      setError(err.message || 'Could not load the board. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard(priorityFilter);
  }, [priorityFilter, loadBoard]);

  async function handleCreate(values) {
    await api.createTask({
      title: values.title,
      description: values.description,
      priority: values.priority,
      columnId: values.columnId,
    });
    setFormState(null);
    await loadBoard(priorityFilter);
  }

  async function handleEditSave(values) {
    await api.updateTask(formState.task.id, {
      title: values.title,
      description: values.description,
      priority: values.priority,
    });
    setFormState(null);
    await loadBoard(priorityFilter);
  }

  async function handleDelete(task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      await loadBoard(priorityFilter);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMove(task, newColumnId) {
    // update UI first, roll back if the request fails - feels instant
    setBoard((prev) => {
      if (!prev) return prev;
      const columns = prev.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== task.id),
      }));
      const target = columns.find((c) => c.id === newColumnId);
      if (target) target.tasks.unshift({ ...task, column_id: newColumnId });
      return { ...prev, columns };
    });
    try {
      await api.moveTask(task.id, newColumnId);
    } catch (err) {
      setError(err.message);
      await loadBoard(priorityFilter); // roll back to server truth
    }
  }

  if (loading && !board) {
    return <div className="status-message">Loading board...</div>;
  }

  if (error && !board) {
    return (
      <div className="status-message error">
        <p>{error}</p>
        <button onClick={() => loadBoard(priorityFilter)}>Retry</button>
      </div>
    );
  }

  const searchLower = searchText.trim().toLowerCase();
  const visibleColumns = board.columns.map((col) => ({
    ...col,
    tasks: searchLower
      ? col.tasks.filter((t) => t.title.toLowerCase().includes(searchLower))
      : col.tasks,
  }));

  return (
    <div className="app">
      <header className="app-header">
        <h1>TaskFlow</h1>
        <p className="board-name">{board.name}</p>
      </header>

      {error && (
        <div className="banner error">
          {error} <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      <div className="toolbar">
        <label className="filter-label">
          Priority:
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>

        <input
          type="text"
          className="search-box"
          placeholder="Search by title..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="board">
        {visibleColumns.map((col) => (
          <Column
            key={col.id}
            column={col}
            allColumns={board.columns}
            onAddTask={(columnId) => setFormState({ mode: 'create', columnId })}
            onEdit={(task) => setFormState({ mode: 'edit', task })}
            onDelete={handleDelete}
            onMove={handleMove}
          />
        ))}
      </div>

      {formState?.mode === 'create' && (
        <TaskForm
          columns={board.columns}
          defaultColumnId={formState.columnId}
          onSave={handleCreate}
          onCancel={() => setFormState(null)}
        />
      )}

      {formState?.mode === 'edit' && (
        <TaskForm
          initialTask={formState.task}
          columns={board.columns}
          onSave={handleEditSave}
          onCancel={() => setFormState(null)}
        />
      )}
    </div>
  );
}
