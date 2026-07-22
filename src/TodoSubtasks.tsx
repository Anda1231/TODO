/**
 * 待办子任务列表。
 *
 * 仅在已有子任务时渲染；新增入口在右键菜单，避免空状态占位。
 * 默认折叠只显示进度行，展开后再勾选 / 编辑 / 删除。
 */
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import type React from "react";
import type { TodoSubtask } from "./types/todo";

type TodoSubtasksProps = {
  subtasks: TodoSubtask[];
  onToggle: (subtaskId: string) => void;
  onUpdate: (subtaskId: string, title: string) => void;
  onDelete: (subtaskId: string) => void;
};

export default function TodoSubtasks({
  subtasks,
  onToggle,
  onUpdate,
  onDelete
}: TodoSubtasksProps): React.ReactElement | null {
  /** 无子任务时完全不占位 */
  if (subtasks.length === 0) return null;

  return <TodoSubtasksPanel subtasks={subtasks} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} />;
}

type TodoSubtasksPanelProps = TodoSubtasksProps & {
  subtasks: TodoSubtask[];
};

function TodoSubtasksPanel({
  subtasks,
  onToggle,
  onUpdate,
  onDelete
}: TodoSubtasksPanelProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const doneCount = subtasks.filter((item) => item.done).length;

  const saveEdit = (): void => {
    if (!editingId) return;
    const title = editingTitle.trim();
    if (title) {
      onUpdate(editingId, title);
    }
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="todo-subtasks">
      <button
        type="button"
        className="todo-subtasks-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (
          <ChevronDown aria-hidden className="todo-subtasks-chevron" strokeWidth={2} />
        ) : (
          <ChevronRight aria-hidden className="todo-subtasks-chevron" strokeWidth={2} />
        )}
        <span>
          子任务 {doneCount}/{subtasks.length}
        </span>
      </button>

      {expanded ? (
        <div className="todo-subtasks-body">
          {subtasks.map((subtask) => (
            <div className={`todo-subtask${subtask.done ? " done" : ""}`} key={subtask.id}>
              <button
                type="button"
                className="todo-subtask-check"
                aria-label={subtask.done ? `取消完成 ${subtask.title}` : `完成 ${subtask.title}`}
                onClick={() => onToggle(subtask.id)}
              />
              {editingId === subtask.id ? (
                <input
                  className="todo-subtask-input"
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveEdit();
                    }
                    if (event.key === "Escape") {
                      setEditingId(null);
                      setEditingTitle("");
                    }
                  }}
                  aria-label="编辑子任务"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="todo-subtask-title"
                  onClick={() => {
                    setEditingId(subtask.id);
                    setEditingTitle(subtask.title);
                  }}
                >
                  {subtask.title}
                </button>
              )}
              <button
                type="button"
                className="icon-button danger-button todo-subtask-delete"
                aria-label={`删除子任务 ${subtask.title}`}
                onClick={() => onDelete(subtask.id)}
              >
                <Trash2 aria-hidden className="button-icon" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
