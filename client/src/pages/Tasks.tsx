import { useEffect, useState } from "react";
import { listMyTasks, addTask, toggleTask, removeTask } from "../utils/tasksDb";
import { supabase } from "../utils/supabase";
import { listMyGoals, assignTaskToGoal } from "../utils/goalsDb";
import type { TaskRow, GoalRow } from "../types";

// 요일 비트값 (월=1, 화=2, ... 일=64)
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function maskHas(mask: number, bit: number) {
  return (mask & bit) !== 0;
}
function toggleBit(mask: number, bit: number) {
  return maskHas(mask, bit) ? (mask & ~bit) : (mask | bit);
}
function prettyRepeat(mask: number | null) {
  if (!mask) return "";
  if (mask === 31) return "주중(월~금)";
  if (mask === 96) return "주말(토/일)";
  if (mask === 127) return "매일";
  const picked: string[] = [];
  DAY_BITS.forEach((bit, i) => { if (maskHas(mask, bit)) picked.push(DAY_LABELS[i]); });
  return picked.join(",");
}

export default function Tasks() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>("");   // YYYY-MM-DD
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatMask, setRepeatMask] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAuthed(false); return; }
        setAuthed(true);
        const [taskList, goalList] = await Promise.all([listMyTasks(), listMyGoals()]);
        if (!mounted) return;
        setItems(taskList);
        setGoals(goalList);
      } catch (e: any) {
        setErr(e.message ?? "목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onAdd = async () => {
    const titleTrim = title.trim();
    if (!titleTrim) return;

    try {
      const row = await addTask(
        titleTrim,
        dueDate || null,
        repeatMask ? repeatMask : null
      );
      setItems(prev => [row, ...prev]);
      // 입력 초기화
      setTitle("");
      setDueDate("");
      setRepeatMask(0);
      setRepeatOpen(false);
    } catch (e: any) {
      setErr(e.message ?? "추가 실패");
    }
  };

  const onToggle = async (id: string, next: boolean) => {
    try {
      const row = await toggleTask(id, next);
      setItems(prev => prev.map(it => (it.id === id ? row : it)));
    } catch (e: any) {
      setErr(e.message ?? "업데이트 실패");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await removeTask(id);
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (e: any) {
      setErr(e.message ?? "삭제 실패");
    }
  };

  const onAssignGoal = async (taskId: string, goalId: string | "") => {
    try {
      const g = goalId === "" ? null : goalId;
      await assignTaskToGoal(taskId, g);
      setItems(prev => prev.map(it => (it.id === taskId ? { ...it, goal_id: g } : it)));
    } catch (e: any) {
      setErr(e.message ?? "목표 연결 실패");
    }
  };

  if (!authed) return <section><p>로그인이 필요합니다.</p></section>;
  if (loading) return <section><p>불러오는 중…</p></section>;

  return (
    <section style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 12 }}>할 일</h2>

      {/* 입력 박스 */}
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="할 일 입력"
            style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
          />
          <button onClick={() => setRepeatOpen(o => !o)} title="반복 설정">
            반복
          </button>
          <button onClick={onAdd}>추가</button>
        </div>

        {/* 마감 날짜 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "#6b7280" }}>마감일</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ padding: 6, border: "1px solid #ddd", borderRadius: 8 }}
          />
          {repeatMask ? (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              반복: {prettyRepeat(repeatMask)}
            </span>
          ) : null}
        </div>

        {/* 반복 요일 토글 */}
        {repeatOpen && (
          <div style={{ display: "flex", gap: 6 }}>
            {DAY_BITS.map((bit, i) => {
              const active = maskHas(repeatMask, bit);
              return (
                <button
                  key={bit}
                  onClick={() => setRepeatMask(prev => toggleBit(prev, bit))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: active ? "#eef6ff" : "white",
                    fontWeight: active ? 600 : 400
                  }}
                >
                  {DAY_LABELS[i]}
                </button>
              );
            })}
            <button
              onClick={() => setRepeatMask(0)}
              style={{ marginLeft: 8, padding: "6px 10px", borderRadius: 8 }}
              title="반복 해제"
            >
              해제
            </button>
          </div>
        )}
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {/* 목록 */}
      {items.length === 0 ? (
        <p>아직 할 일이 없어요.</p>
      ) : (
        <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0 }}>
          {items.map(it => (
            <li key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={e => onToggle(it.id, e.target.checked)}
                  />
                  <span style={{ textDecoration: it.done ? "line-through" : "none" }}>
                    {it.title}
                  </span>
                </label>
                <button onClick={() => onDelete(it.id)} style={{ fontSize: 12 }}>삭제</button>
              </div>

              {/* 목표 선택 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>목표:</span>
                <select
                  value={it.goal_id ?? ""}
                  onChange={e => onAssignGoal(it.id, e.target.value)}
                  style={{ padding: "4px 6px", borderRadius: 6 }}
                >
                  <option value="">(연결 안 함)</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} {g.target_count ? `(${g.achieved_count}/${g.target_count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 메타 표시: 마감/반복 */}
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                {it.due_date && <span>마감: {it.due_date}</span>}
                {it.repeat_mask ? <span>반복: {prettyRepeat(it.repeat_mask)}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
