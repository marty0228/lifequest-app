import { useEffect, useMemo, useState } from "react";
import type { Task } from "../types";
import { loadTasks, saveTasks } from "../utils/storage";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks<Task>());

  // 멀티탭이나 다른 페이지(Tasks)에서 변경된 것 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lifequest.tasks") {
        setTasks(loadTasks<Task>());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  // 분류
  const { today, overdue, completedToday } = useMemo(() => {
    const t: Task[] = [];
    const o: Task[] = [];
    const c: Task[] = [];

    for (const it of tasks) {
      const hasDue = !!it.dueDate;
      const isToday = hasDue ? it.dueDate === todayStr : it.createdAt.startsWith(todayStr);
      const isOverdue = hasDue && it.dueDate! < todayStr && !it.completed;

      if (isOverdue) o.push(it);
      else if (isToday && !it.completed) t.push(it);
      else if (isToday && it.completed) c.push(it);
    }
    // 최신 생성순 정렬
    const sortDesc = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
    return { today: t.sort(sortDesc), overdue: o.sort(sortDesc), completedToday: c.sort(sortDesc) };
  }, [tasks, todayStr]);

  const totalToday = today.length + completedToday.length;
  const progress = totalToday === 0 ? 0 : Math.round((completedToday.length / totalToday) * 100);

  function toggle(id: string) {
    setTasks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
      saveTasks(next);
      return next;
    });
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 8 }}>대시보드</h2>
        <p style={{ color: "#6b7280" }}>
          오늘({todayStr}) 진행 요약 · 오늘 할 일 {totalToday}개 중 {completedToday.length}개 완료
        </p>
        {/* 진행률 바 */}
        <div style={{ marginTop: 10, height: 8, background: "#f3f4f6", borderRadius: 999 }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#6366f1", transition: "width .2s" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{progress}%</div>
      </header>

      {overdue.length > 0 && (
        <Section title="⚠ 마감 지남" hint="가능한 빨리 처리하세요">
          {overdue.map(t => (
            <TaskRow key={t.id} t={t} onToggle={toggle} overdue />
          ))}
        </Section>
      )}

      <Section title="오늘의 퀘스트">
        {today.length === 0 ? (
          <Empty text={totalToday === 0 ? "오늘 할 일이 없어요 🎉" : "모든 오늘 할 일을 끝냈어요 ✅"} />
        ) : (
          today.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} />)
        )}
      </Section>

      {completedToday.length > 0 && (
        <Section title="오늘 완료한 항목">
          {completedToday.map(t => (
            <TaskRow key={t.id} t={t} onToggle={toggle} />
          ))}
        </Section>
      )}
    </section>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {hint && <span style={{ fontSize: 12, color: "#6b7280" }}>{hint}</span>}
      </div>
      <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>{children}</ul>
    </div>
  );
}

function TaskRow({ t, onToggle, overdue }: { t: Task; onToggle: (id: string) => void; overdue?: boolean }) {
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
      <input type="checkbox" checked={t.completed} onChange={() => onToggle(t.id)} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, textDecoration: t.completed ? "line-through" : "none" }}>
          {t.title}
          {overdue && <span style={{ marginLeft: 8, fontSize: 12, color: "#ef4444" }}>(마감 지남)</span>}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          생성: {new Date(t.createdAt).toLocaleString()}
          {t.dueDate ? ` · 마감: ${t.dueDate}` : ""}
        </div>
      </div>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return <li style={{ color: "#6b7280" }}>{text}</li>;
}