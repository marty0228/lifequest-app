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
} from "../utils/tasksDb";
import type { TaskRow as DbTaskRow } from "../types"; // ✅ DB 행 타입 (별칭), type을 전부 types.ts에서 import 하는 걸로 통일함
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
      <div className="fade-in" style={{ display: "grid", gap: 20 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ marginBottom: 8 }}>대시보드</h2>
          <p style={{ color: "var(--color-text-tertiary)" }}>로그인 상태 확인 중…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fade-in" style={{ display: "grid", gap: 20 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
          <h2 style={{ marginBottom: 8 }}>대시보드</h2>
          <p style={{ color: "var(--color-text-tertiary)", marginBottom: 24 }}>
            로그인 후 퀘스트를 시작하세요!
          </p>
          <AuthPanel />
        </div>
      </div>
    );
  }

  const userName = user.email?.split('@')[0] || '사용자';

  return (
    <section className="fade-in" style={{ display: "grid", gap: 20 }}>
      {/* 헤더 카드 - 그라데이션 배경 */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
        color: "white",
        padding: "32px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 장식 요소 */}
        <div style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
        }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
          <h2 style={{ color: "white", marginBottom: 8 }}>
            안녕하세요, {userName}님!
          </h2>
          <p style={{ 
            color: "rgba(255, 255, 255, 0.9)", 
            fontSize: 14,
            marginBottom: 20 
          }}>
            오늘도 멋진 하루 보내세요 ✨
          </p>

          {/* 프로그레스 바 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: 8 
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                오늘의 진행률
              </span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ 
              height: 12, 
              background: "rgba(255, 255, 255, 0.2)", 
              borderRadius: 999,
              overflow: "hidden"
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: "100%", 
                background: "linear-gradient(90deg, #10B981 0%, #34D399 100%)",
                borderRadius: 999, 
                transition: "width 0.5s ease-out",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
              }} />
            </div>
          </div>

          <div style={{ 
            display: "flex", 
            gap: 16,
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.85)"
          }}>
            <span>📊 전체 {totalToday}개</span>
            <span>✅ 완료 {completedToday.length}개</span>
            <span>⏳ 남은 일 {today.length}개</span>
          </div>
        </div>
      </div>

      {/* 퀘스트 추가 카드 */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>➕</span>
          <span>새 퀘스트 추가</span>
        </h3>
        <form onSubmit={onAdd} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input 
            name="title" 
            placeholder="무엇을 할까요?" 
            style={{ flex: "1 1 250px" }}
          />
          <input 
            name="due" 
            type="date" 
            style={{ flex: "0 0 auto", minWidth: 160 }}
          />
          <button type="submit" style={{ flex: "0 0 auto" }}>
            추가하기
          </button>
        </form>
      </div>

      {/* 마감 지난 항목 (있을 경우) */}
      {overdue.length > 0 && (
        <Section 
          title="⚠️ 마감 지남" 
          badge={overdue.length}
          hint="빨리 처리가 필요해요!"
          color="var(--color-danger)"
        >
          {overdue.map(t => (
            <TaskRow 
              key={t.id} 
              t={t} 
              onToggle={toggle} 
              overdue 
              onEdit={() => editTask(t)} 
              onDelete={() => removeTask(t.id)} 
            />
          ))}
        </Section>
      )}

      {/* 오늘의 퀘스트 */}
      <Section 
        title="📋 오늘의 퀘스트" 
        badge={today.length}
        color="var(--color-primary)"
      >
        {today.length === 0 ? (
          <Empty 
            emoji="🎉" 
            text={totalToday === 0 ? "오늘 할 일이 없어요!" : "모든 오늘 할 일을 끝냈어요!"} 
          />
        ) : (
          today.map(t => (
            <TaskRow 
              key={t.id} 
              t={t} 
              onToggle={toggle} 
              onEdit={() => editTask(t)} 
              onDelete={() => removeTask(t.id)} 
            />
          ))
        )}
      </Section>

      {/* 완료한 항목 */}
      {completedToday.length > 0 && (
        <Section 
          title="✅ 오늘 완료" 
          badge={completedToday.length}
          color="var(--color-success)"
        >
          {completedToday.map(t => (
            <TaskRow 
              key={t.id} 
              t={t} 
              onToggle={toggle} 
              onEdit={() => editTask(t)} 
              onDelete={() => removeTask(t.id)} 
            />
          ))}
        </Section>
      )}

      {/* 전체 퀘스트 */}
      <Section 
        title="📚 전체 퀘스트" 
        badge={tasks.length}
        collapsible
      >
        {tasks.length === 0 ? (
          <Empty emoji="🎯" text="퀘스트가 아직 없어요" />
        ) : (
          tasks.map(t => (
            <TaskRow 
              key={t.id} 
              t={t} 
              onToggle={toggle} 
              onEdit={() => editTask(t)} 
              onDelete={() => removeTask(t.id)} 
            />
          ))
        )}
      </Section>
    </section>
  );
}

function Section({ 
  title, 
  badge,
  hint, 
  color,
  collapsible,
  children 
}: { 
  title: string; 
  badge?: number;
  hint?: string; 
  color?: string;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="card">
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: collapsed ? 0 : 16,
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={() => collapsible && setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span style={{
              background: color || "var(--color-gray-200)",
              color: color ? "white" : "var(--color-text-primary)",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 12,
            }}>
              {badge}
            </span>
          )}
        </div>
        {hint && (
          <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
            {hint}
          </span>
        )}
        {collapsible && (
          <span style={{ 
            fontSize: 20,
            transition: "transform 0.2s",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}>
            ▼
          </span>
        )}
      </div>
      
      {!collapsed && (
        <ul style={{ 
          display: "grid", 
          gap: 10, 
          margin: 0, 
          padding: 0, 
          listStyle: "none" 
        }}>
          {children}
        </ul>
      )}
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
    <li 
      className="card" 
      style={{ 
        display: "flex", 
        gap: 12, 
        alignItems: "center",
        padding: 16,
        background: t.completed ? "var(--color-gray-50)" : "white",
        transition: "all 0.2s",
      }}
    >
      <input 
        type="checkbox" 
        checked={t.completed} 
        onChange={() => onToggle(t.id)} 
      />
      
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: 15,
          textDecoration: t.completed ? "line-through" : "none",
          color: t.completed ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
          marginBottom: 6,
        }}>
          {t.title}
          {overdue && (
            <span style={{ 
              marginLeft: 8, 
              fontSize: 11, 
              fontWeight: 600,
              color: "white",
              background: "var(--color-danger)",
              padding: "2px 8px",
              borderRadius: 6,
            }}>
              실패
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: 12, 
          color: "var(--color-text-tertiary)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}>
          {t.dueDate && (
            <span>📅 마감: {t.dueDate}</span>
          )}
          <span>🕐 생성: {new Date(t.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button 
          onClick={onEdit} 
          className="ghost"
          style={{ 
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          수정
        </button>
        <button
          onClick={onDelete}
          className="ghost danger"
          style={{ 
            padding: "8px 12px",
            fontSize: 13,
            color: "var(--color-danger)",
          }}
        >
          삭제
        </button>
      </div>
    </li>
  );
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <li style={{ 
      textAlign: "center", 
      padding: "40px 20px",
      color: "var(--color-text-tertiary)" 
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 15 }}>{text}</div>
    </li>
  );
}
