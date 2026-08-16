export default function TaskCard({ task, columns, onEdit, onDelete, onMove }) {
  return (
    <div className="task-card">
      <div className="task-card-top">
        <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
        <span className="task-date">
          {new Date(task.created_at).toLocaleDateString()}
        </span>
      </div>

      <h4 className="task-title">{task.title}</h4>
      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-card-actions">
        <select
          className="move-select"
          value={task.column_id}
          onChange={(e) => onMove(task, Number(e.target.value))}
          aria-label="Move task to column"
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="link-btn" onClick={() => onEdit(task)}>Edit</button>
        <button className="link-btn danger" onClick={() => onDelete(task)}>Delete</button>
      </div>
    </div>
  );
}
