import { useEffect, useMemo, useState } from "react";
import type { Task } from "../types";
import { loadTasks, saveTasks } from "../utils/storage";

// yyyy-mm-dd
const ymd = (d: Date) => d.toISOString().slice(0, 10);
// 달력에 표시할 기준일: dueDate가 있으면 그날, 없으면 createdAt 날짜
const taskDate = (t: Task) => (t.dueDate || t.createdAt).slice(0, 10);

// 해당 달의 1일을 기준으로 6주(42칸) 그리드 생성, 요일은 월~일
function getMonthGrid(base: Date) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // 월=0 기준
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function Habits() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks<Task>());
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null); // yyyy-mm-dd

  // 다른 탭/페이지에서 수정되면 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lifequest.tasks") setTasks(loadTasks<Task>());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 날짜별 집계: all/done/left
  const byDate = useMemo(() => {
    const map = new Map<string, { all: Task[]; done: number; left: number }>();
    for (const t of tasks) {
      const d = taskDate(t);
      if (!map.has(d)) map.set(d, { all: [], done: 0, left: 0 });
      const b = map.get(d)!;
      b.all.push(t);
      t.completed ? (b.done += 1) : (b.left += 1);
    }
    return map;
  }, [tasks]);

  const grid = useMemo(() => getMonthGrid(month), [month]);
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
  const todayStr = ymd(new Date());

  const prevMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(ymd(now));
  };

  const toggleComplete = (id: string) =>
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      saveTasks(next);
      return next;
    });

  const selectedList = useMemo(() => {
    if (!selected) return [];
    const b = byDate.get(selected);
    return b ? [...b.all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  }, [selected, byDate]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ marginRight: 8 }}>캘린더</h2>
        <button onClick={prevMonth} style={navBtn}>◀︎</button>
        <strong>{monthLabel}</strong>
        <button onClick={nextMonth} style={navBtn}>▶︎</button>
        <button onClick={goToday} style={{ ...navBtn, marginLeft: "auto" }}>
          오늘로
        </button>
      </header>

      <div style={weekHeader}>
        {["월","화","수","목","금","토","일"].map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={gridWrap}>
        {grid.map((d, i) => {
          const dStr = ymd(d);
          const isThisMonth = d.getMonth() === month.getMonth();
          const b = byDate.get(dStr);
          const total = b?.all.length ?? 0;
          const done = b?.done ?? 0;
          const left = b?.left ?? 0;

          // 상태 색상: 없음=회색, 모두 완료=초록, 일부/미완료=주황
          const statusColor = total === 0 ? "#e5e7eb" : left === 0 ? "#22c55e" : "#f59e0b";
          const isToday = dStr === todayStr;
          const isSelected = dStr === selected;

          return (
            <button
              key={dStr + i}
              onClick={() => setSelected(dStr)}
              style={{
                ...cell,
                opacity: isThisMonth ? 1 : 0.45,
                outline: isSelected ? "2px solid #6366f1" : "1px solid #e5e7eb",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{d.getDate()}</div>
                {isToday && (
                  <span style={todayBadge}>오늘</span>
                )}
              </div>

              {/* 완료율 바 */}
              <div style={{ height: 6, borderRadius: 999, background: "#f3f4f6", marginTop: 6 }}>
                <div style={{ width: total ? `${(done / total) * 100}%` : 0, height: "100%", borderRadius: 999, background: statusColor }} />
              </div>

              <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                {total === 0 ? "퀘스트 없음" : `완료 ${done} / ${total}`}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#6b7280", fontSize: 12 }}>
        <Legend color="#22c55e" label="모두 완료" />
        <Legend color="#f59e0b" label="일부/미완료" />
        <Legend color="#e5e7eb" label="퀘스트 없음" />
      </div>

      {/* 선택 날짜의 퀘스트 상세 */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>선택한 날짜</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{selected ?? "없음"}</span>
        </div>

        {(!selected || selectedList.length === 0) ? (
          <div style={{ color: "#6b7280" }}>표시할 항목이 없습니다.</div>
        ) : (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
            {selectedList.map((t) => (
              <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                <input type="checkbox" checked={t.completed} onChange={() => toggleComplete(t.id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, textDecoration: t.completed ? "line-through" : "none" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    기준일: {taskDate(t)}{t.dueDate ? " (마감일)" : " (생성일)"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 14, height: 6, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

const navBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  cursor: "pointer",
  background: "white",
};

const weekHeader: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const gridWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const cell: React.CSSProperties = {
  borderRadius: 12,
  padding: 10,
  minHeight: 78,
  textAlign: "left",
  background: "white",
};

const todayBadge: React.CSSProperties = {
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4f46e5",
};