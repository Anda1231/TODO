/**
 * 待办标签展示与编辑。
 * - chips：列表内只读展示已有标签
 * - editor：右键菜单内切换预设标签（无自定义）
 */
import type React from "react";
import { PRESET_TAGS } from "./types/todo";

/** 标签名 → CSS 色调后缀，用于 .todo-tag-* 样式 */
export const tagTone = (tag: string): string => {
  if (tag === "工作") return "work";
  if (tag === "生活") return "life";
  if (tag === "学习") return "study";
  if (tag === "紧急") return "urgent";
  return "custom";
};

type TodoTagChipsProps = {
  tags: string[];
};

/** 列表内紧凑展示；无标签时不占位 */
export function TodoTagChips({ tags }: TodoTagChipsProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  return (
    <div className="todo-tags-chips" aria-label="标签">
      {tags.map((tag) => (
        <span key={tag} className={`todo-tag todo-tag-${tagTone(tag)}`}>
          {tag}
        </span>
      ))}
    </div>
  );
}

type TodoTagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/** 右键菜单内：仅预设标签多选切换 */
export function TodoTagEditor({ tags, onChange }: TodoTagEditorProps): React.ReactElement {
  const toggleTag = (tag: string): void => {
    if (tags.includes(tag)) {
      onChange(tags.filter((item) => item !== tag));
      return;
    }
    onChange([...tags, tag]);
  };

  return (
    <div className="todo-tags-editor">
      <div className="todo-tags-presets">
        {PRESET_TAGS.map((tag) => {
          const selected = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              className={`todo-tag todo-tag-${tagTone(tag)}${selected ? " selected" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
