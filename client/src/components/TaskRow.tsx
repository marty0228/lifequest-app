// client/src/components/TaskRow.tsx
import { useState } from "react";
import type { TaskRow as T } from "../utils/tasksDb";

type Props = {
  t: T;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
};

export default function TaskRow({ t, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const [note, setNote] = useState(t.note ?? "");
  const [due, setDue] = useState<string>(t.due_date ?? "");

  const onSave = () => {
    onUpdate(t.id, {
      title: title.trim(),
      note: note.trim() || null,
      due_date: due || null,
    } as Partial<T>);
    setEditing(false);
  };

  const onCancel = () => {
    setTitle(t.title);
    setNote(t.note ?? "");
    setDue(t.due_date ?? "");
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-200">
      <input
        type="checkbox"
        checked={t.done}
        onChange={() => onToggle(t.id)}
        className="mt-1"
      />

      {editing ? (
        <div className="flex-1 flex flex-col gap-2">
          <input
            className="border rounded px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
          />
          <input
            className="border rounded px-2 py-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모(선택)"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">마감</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded bg-black text-white"
              onClick={onSave}
            >
              저장
            </button>
            <button className="px-3 py-1 rounded border" onClick={onCancel}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className={`font-medium ${t.done ? "line-through text-gray-400" : ""}`}>
            {t.title}
          </div>
          <div className="text-sm text-gray-500">
            {t.note || ""}
            {t.due_date && (
              <span className="ml-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                DUE {t.due_date}
              </span>
            )}
          </div>
        </div>
      )}

      {!editing ? (
        <div className="flex gap-2">
          <button className="px-2 py-1 text-sm underline" onClick={() => setEditing(true)}>
            수정
          </button>
          <button
            className="px-2 py-1 text-sm text-red-600 underline"
            onClick={() => onDelete(t.id)}
          >
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}