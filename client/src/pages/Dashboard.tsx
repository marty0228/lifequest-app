import { useEffect, useMemo, useState } from "react";
import type { Task } from "../types";

// Supabase 연동
import { useAuth } from "../hooks/useAuth";
import { fetchTasks, addTask, toggleTask as toggleTaskDb } from "../utils/tasksDb";
import AuthPanel from "../components/AuthPanel";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const todayStr = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  // 로그인 후 DB에서 목록 로드
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const rows = await fetchTasks(user.id);
        setTasks(rows);
      } catch (e) {
        console.error(e);
        alert("작업 목록을 불러오지 못했습니다.");
      }
    })();
  }, [user]);

  // 분류/진행률 계산
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
    const t2 = t.sort(sortDesc);
    const o2 = o.sort(sortDesc);
    const c2 = c.sort(sortDesc);
    const total = t2.length + c2.length;
    const prog = total === 0 ? 0 : Math.round((c2.length / total) * 100);
    return { today: t2, overdue: o2, completedToday: c2, totalToday: total, progress: prog };
  }, [tasks, todayStr]);

  // 완료 토글 → DB 업데이트 후 상태 반영
  async function toggle(id: string) {
    try {
      const updated = await toggleTaskDb(id);
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
    } catch (e) {
      console.error(e);
      alert("체크 변경 실패");
    }
  }

  // 간단 추가 폼 (원하면 숨겨도 됨)
  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim();
    const due = (fd.get("due") as string) || undefined;
    if (!title) return;
    try {
      const row = await addTask(user.id, title, due);
      setTasks(prev => [row, ...prev]);
      e.currentTarget.reset();
    } catch (err) {
      console.error(err);
      alert("추가 실패");
    }
  }

  // 로딩 중
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

  // 비로그인 → 로그인 패널만 노출
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

  // 로그인 상태 → 기존 화면 + 추가 폼
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 8 }}>대시보드</h2>
        <p style={{ color: "#6b7280" }}>
          {user.email}님, 환영합니다! 오늘({todayStr}) 진행 요약 · 오늘 할 일 {totalToday}개 중 {completedToday.length}개 완료
        </p>

        {/* 진행률 바 */}
        <div style={{ marginTop: 10, height: 8, background: "#f3f4f6", borderRadius: 999 }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#6366f1", transition: "width .2s" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{progress}%</div>

        {/* 간단 추가 폼 */}
        <form onSubmit={onAdd} style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input name="title" placeholder="새 퀘스트" />
          <input name="due" type="date" />
          <button type="submit">추가</button>
        </form>
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