import TaskCard from './TaskCard.jsx';

export default function Column({ column, allColumns, onEdit, onDelete, onMove, onAddTask }) {
  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.name}</h3>
        <span className="task-count">{column.tasks.length}</span>
      </div>

      <button className="add-task-btn" onClick={() => onAddTask(column.id)}>
        + Add task
      </button>

      <div className="task-list">
        {column.tasks.length === 0 && <p className="empty-hint">No tasks here.</p>}
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columns={allColumns}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}
