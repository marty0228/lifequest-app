import { useEffect, useMemo, useState } from "react";
import type { TaskRow } from "../types";
import { listMyTasks, toggleTask } from "../utils/tasksDb";

// 로컬 타임존 기준 YYYY-MM-DD
const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// 월(1)~일(64) 비트
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64] as const;
// JS: 0=일, 1=월... 을 월=0 기준으로 바꿔서 쓰기
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;
const hasBit = (mask: number, bit: number) => (mask & bit) !== 0;

// 해당 달의 1일을 기준으로 6주(42칸) 그리드 생성 (월~일)
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

// 하루에 표시할 작업 계산 규칙
// - 과거/오늘: 그날 '마감(due_date === dStr)' + '반복(repeat_mask 에 해당 요일 on)' + (due/repeat 둘 다 없으면 생성일자 created_at === dStr)
// - 미래: 그날 마감(due_date === dStr)만 표시
function getTasksOfDate(d: Date, tasks: TaskRow[], todayStr: string) {
  const dStr = ymd(d);
  const isPast = dStr < todayStr;
  const wBit = DAY_BITS[mondayIndex(d)];

  return tasks.filter((t) => {
    // 1) 마감일 당일은 언제든 표시 (과거든 미래든)
    if (t.due_date && t.due_date === dStr) return true;

    // 2) 반복 항목
    if (t.repeat_mask) {
      // 과거는 반복 표시하지 않음
      if (isPast) return false;

      // today/future: 요일이 맞고, (due_date가 있으면 그 날짜 이내)일 때만
      if (!hasBit(t.repeat_mask, wBit)) return false;
      if (t.due_date && dStr > t.due_date) return false;
      return true;
    }

    // 3) 반복/마감 없는 1회성: 생성일자에만 표시
    if (!t.due_date && !t.repeat_mask && t.created_at) {
      const created = ymd(new Date(t.created_at));
      return created === dStr;
    }

    return false;
  });
}

export default function Calendar() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const now = new Date();
  const todayStr = ymd(now);

  const [month, setMonth] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(todayStr); // 기본 오늘

  useEffect(() => {
    (async () => {
      try {
        const list = await listMyTasks();
        setTasks(list);
      } catch (e: any) {
        setErr(e.message ?? "작업 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grid = useMemo(() => getMonthGrid(month), [month]);
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;

  const prevMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setMonth(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelected(ymd(n));
  };

  const onToggle = async (id: string, next: boolean) => {
    try {
      const row = await toggleTask(id, next);
      setTasks((prev) => prev.map((t) => (t.id === id ? row : t)));
    } catch (e: any) {
      setErr(e.message ?? "상태 변경 실패");
    }
  };

  const selectedList = useMemo(() => {
    if (!selected) return [];
    const d = new Date(selected);
    return getTasksOfDate(d, tasks, todayStr).sort((a, b) => {
      const ac = a.created_at ?? "";
      const bc = b.created_at ?? "";
      return bc.localeCompare(ac);
    });
  }, [selected, tasks, todayStr]);

  if (loading) return <section><p>불러오는 중…</p></section>;
  if (err) return <section><p style={{ color: "crimson" }}>{err}</p></section>;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ marginRight: 8 }}>캘린더</h2>
        <button onClick={prevMonth} style={navBtn}>◀︎</button>
        <strong>{monthLabel}</strong>
        <button onClick={nextMonth} style={navBtn}>▶︎</button>
        <button onClick={goToday} style={{ ...navBtn, marginLeft: "auto" }}>오늘로</button>
      </header>

      <div style={weekHeader}>
        {["월","화","수","목","금","토","일"].map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>{w}</div>
        ))}
      </div>

      <div style={gridWrap}>
        {grid.map((d, i) => {
          const dStr = ymd(d);
          const isThisMonth = d.getMonth() === month.getMonth();
          const list = getTasksOfDate(d, tasks, todayStr);

          const total = list.length;
          const done = list.filter((t) => t.done).length;
          const left = total - done;

          // 없음=회색, 전부 완료=초록, 일부/미완료=주황
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
                {isToday && <span style={todayBadge}>오늘</span>}
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

      {/* 선택 날짜 상세 */}
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
                <input type="checkbox" checked={t.done} onChange={(e) => onToggle(t.id, e.target.checked)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {t.due_date ? `마감일: ${t.due_date}` :
                      t.created_at ? `생성일: ${ymd(new Date(t.created_at))}` : ""}
                    {t.repeat_mask ? " • 반복" : ""}
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
