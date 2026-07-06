/**
 * 待办紧急评分组件（1–5 星）。
 *
 * 点击触发按钮展开下拉菜单选择评分；点击组件外部自动关闭。
 * 评分影响 sortTodos 中的列表排序（高分优先）。
 */
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import { TODO_RATING_MAX, TODO_RATING_MIN } from "./types/todo";

type TodoRatingProps = {
  rating: number;
  onChange: (rating: number) => void;
};

const StarIcon = (): React.ReactElement => (
  <Star aria-hidden className="todo-rating-star" fill="currentColor" strokeWidth={0} />
);

export default function TodoRating({ rating, onChange }: TodoRatingProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /** 菜单打开时监听全局 pointerdown，点击外部区域关闭 */
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const options = Array.from({ length: TODO_RATING_MAX - TODO_RATING_MIN + 1 }, (_, index) => TODO_RATING_MIN + index);

  return (
    <div className="todo-rating" ref={rootRef}>
      <button
        className="todo-rating-trigger"
        type="button"
        aria-label={`紧急评分 ${rating}，点击修改`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <StarIcon />
        <span>{rating}</span>
      </button>
      {open ? (
        <div className="todo-rating-menu" role="listbox" aria-label="选择紧急评分">
          {options.map((value) => (
            <button
              className={value === rating ? "selected" : ""}
              type="button"
              key={value}
              role="option"
              aria-selected={value === rating}
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
            >
              <StarIcon />
              <span>{value}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
