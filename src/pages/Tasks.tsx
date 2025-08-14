import { useEffect, useMemo, useState } from "react";
import type { Task } from "../types";
import { loadTasks, saveTasks } from "../utils/storage";

type Filter = "all" | "active" | "completed";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks<Task>());
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // 로컬스토리지 동기화
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === "active") list = list.filter(t => !t.completed);
    if (filter === "completed") list = list.filter(t => t.completed);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q));
    }
    // 최신 생성일 순
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tasks, filter, query]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    return { total, done, left: total - done };
  }, [tasks]);

  function addTask() {
    const name = title.trim();
    if (!name) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: name,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || undefined,
    };
    setTasks(prev => [newTask, ...prev]);
    setTitle("");
    setDueDate("");
  }

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function clearCompleted() {
    setTasks(prev => prev.filter(t => !t.completed));
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>할일(퀘스트)</h2>

      {/* 입력 영역 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할일을 입력하세요 (예: 알고리즘 과제 제출)"
          style={{ flex: "1 1 280px", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <button onClick={addTask} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer" }}>
          추가
        </button>
      </div>

      {/* 툴바 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setFilter("all")}
            style={btn(filter === "all")}
          >전체</button>
          <button
            onClick={() => setFilter("active")}
            style={btn(filter === "active")}
          >진행중</button>
          <button
            onClick={() => setFilter("completed")}
            style={btn(filter === "completed")}
          >완료</button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          style={{ marginLeft: "auto", minWidth: 160, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <button onClick={clearCompleted} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer" }}>
          완료 항목 삭제
        </button>
      </div>

      {/* 통계 */}
      <p style={{ marginBottom: 12, color: "#6b7280" }}>
        총 {stats.total}개 · 완료 {stats.done}개 · 남은 {stats.left}개
      </p>

      {/* 목록 */}
      <ul style={{ display: "grid", gap: 8 }}>
        {filtered.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
            <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, textDecoration: t.completed ? "line-through" : "none" }}>
                {t.title}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                생성: {new Date(t.createdAt).toLocaleString()}
                {t.dueDate ? ` · 마감: ${t.dueDate}` : ""}
              </div>
            </div>
            <button onClick={() => removeTask(t.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", cursor: "pointer" }}>
              삭제
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li style={{ color: "#6b7280" }}>표시할 항목이 없습니다.</li>
        )}
      </ul>
    </section>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    background: active ? "#eef2ff" : "white",
    fontWeight: active ? 700 : 400,
  };
}