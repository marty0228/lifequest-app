// client/src/pages/Dashboard.tsx
import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import type { Task } from "../types";
import { useAuth } from "../hooks/useAuth";
import {
  listMyTasks,                 // ✅ 목록
  addTask as addTaskDb,        // ✅ 추가
  toggleTask as toggleTaskDb,  // ✅ 완료 토글(id, done)
  removeTask as removeTaskDb,  // ✅ 삭제
  updateTask as updateTaskDb,  // ✅ 수정 (통일)
  type TaskRow as DbTaskRow,   // ✅ DB 행 타입 (별칭)
} from "../utils/tasksDb";
import AuthPanel from "../components/AuthPanel";

// DB 행 → 화면용 Task 매핑
function toTask(r: DbTaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    completed: !!r.done,
    createdAt: r.created_at ?? new Date().toISOString(),
    dueDate: r.due_date ?? undefined, // ✅ undefined로 매핑
  };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const rows = await listMyTasks();
        setTasks(rows.map(toTask));
      } catch (e) {
        console.error(e);
        alert("작업 목록을 불러오지 못했습니다.");
      }
    })();
  }, [user]);

  const { today, overdue, completedToday, totalToday, progress } = useMemo(() => {
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
    const sortDesc = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
    const t2 = t.sort(sortDesc), o2 = o.sort(sortDesc), c2 = c.sort(sortDesc);
    const total = t2.length + c2.length;
    const prog = total === 0 ? 0 : Math.round((c2.length / total) * 100);
    return { today: t2, overdue: o2, completedToday: c2, totalToday: total, progress: prog };
  }, [tasks, todayStr]);

  // 완료 토글
  async function toggle(id: string) {
    try {
      const cur = tasks.find(t => t.id === id);
      const nextDone = !cur?.completed;
      const updatedRow = await toggleTaskDb(id, nextDone);
      const updated = toTask(updatedRow);
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
    } catch (e: any) {
      console.error("토글 에러:", e);
      alert("체크 변경 실패: " + (e?.message ?? JSON.stringify(e)));
    }
  }

  // 제목/마감일 수정: 유틸 함수로 통일(updateTaskDb)
  async function editTask(t: Task) {
    const newTitle = window.prompt("새 제목을 입력하세요", t.title);
    if (newTitle === null) return; // 취소
    const newDue = window.prompt("마감일(YYYY-MM-DD, 비우면 제거)", t.dueDate ?? "");
    const dueNormalized = newDue === "" ? null : (newDue ?? t.dueDate ?? null);

    try {
      const updatedRow = await updateTaskDb(t.id, {
        title: newTitle.trim(),
        due_date: dueNormalized,
      });
      const updated = toTask(updatedRow);
      setTasks(prev => prev.map(x => (x.id === t.id ? updated : x)));
    } catch (e: any) {
      console.error("수정 에러:", e);
      alert("수정 실패: " + (e?.message ?? JSON.stringify(e)));
    }
  }

  async function removeTask(id: string) {
    if (!window.confirm("정말 삭제할까요?")) return;
    try {
      await removeTaskDb(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      console.error("삭제 에러:", e);
      alert("삭제 실패: " + (e?.message ?? JSON.stringify(e)));
    }
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const title = (fd.get("title") as string)?.trim();
    const due = (fd.get("due") as string) || null;
    if (!title) return;

    try {
      const row = await addTaskDb(title, { due_date: due });
      setTasks(prev => [toTask(row), ...prev]);
      form.reset();
    } catch (err: any) {
      console.error("추가 에러:", err);
      alert("추가 실패: " + (err?.message ?? JSON.stringify(err)));
    }
  }

  if (loading) {
    return (
      <section style={{ display: "grid", gap: 16 }}>
        <header style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ marginBottom: 8 }}>대시보드</h2>
          <p style={{ color: "#6b7280" }}>로그인 상태 확인 중…</p>
        </header>
      </section>
    );
  }

  if (!user) {
    return (
      <section style={{ display: "grid", gap: 16 }}>
        <header style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ marginBottom: 8 }}>대시보드</h2>
          <p style={{ color: "#6b7280" }}>로그인 후 퀘스트를 사용할 수 있어요.</p>
          <AuthPanel />
        </header>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 8 }}>대시보드</h2>
        <p style={{ color: "#6b7280" }}>
          {user.email}님, 환영합니다! 오늘({todayStr}) 진행 요약 · 오늘 할 일 {totalToday}개 중 {completedToday.length}개 완료
        </p>

        <div style={{ marginTop: 10, height: 8, background: "#f3f4f6", borderRadius: 999 }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#6366f1", transition: "width .2s" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{progress}%</div>

        <form onSubmit={onAdd} style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input name="title" placeholder="새 퀘스트" />
          <input name="due" type="date" />
          <button type="submit">추가</button>
        </form>
      </header>

      <Section title="📋 전체 퀘스트">
        {tasks.length === 0 ? (
          <Empty text="퀘스트가 아직 없어요" />
        ) : (
          tasks.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onEdit={() => editTask(t)} onDelete={() => removeTask(t.id)} />)
        )}
      </Section>

      {overdue.length > 0 && (
        <Section title="⚠ 마감 지남" hint="가능한 빨리 처리하세요">
          {overdue.map(t => (
            <TaskRow key={t.id} t={t} onToggle={toggle} overdue onEdit={() => editTask(t)} onDelete={() => removeTask(t.id)} />
          ))}
        </Section>
      )}

      <Section title="오늘의 퀘스트">
        {today.length === 0 ? (
          <Empty text={totalToday === 0 ? "오늘 할 일이 없어요 🎉" : "모든 오늘 할 일을 끝냈어요 ✅"} />
        ) : (
          today.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onEdit={() => editTask(t)} onDelete={() => removeTask(t.id)} />)
        )}
      </Section>

      {completedToday.length > 0 && (
        <Section title="오늘 완료한 항목">
          {completedToday.map(t => (
            <TaskRow key={t.id} t={t} onToggle={toggle} onEdit={() => editTask(t)} onDelete={() => removeTask(t.id)} />
          ))}
        </Section>
      )}
    </section>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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

function TaskRow({
  t,
  onToggle,
  overdue,
  onEdit,
  onDelete,
}: {
  t: Task;
  onToggle: (id: string) => void;
  overdue?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer" }}>
          수정
        </button>
        <button
          onClick={onDelete}
          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ef4444", color: "#ef4444", cursor: "pointer" }}
        >
          삭제
        </button>
      </div>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return <li style={{ color: "#6b7280" }}>{text}</li>;
}