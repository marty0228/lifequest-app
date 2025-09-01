import { useEffect, useState } from "react";
import { listMyTasks, addTask, toggleTask, removeTask, type TaskRow } from "../utils/tasksDb";
import { supabase } from "../utils/supabase";
import { listMyGoals, assignTaskToGoal, type GoalRow } from "../utils/goalsDb";

export default function Tasks() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
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
    if (!title.trim()) return;
    try {
      const row = await addTask(title.trim());
      setItems(prev => [row, ...prev]);
      setTitle("");
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

  // ✅ 목표 선택 핸들러
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

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="할 일 입력"
          style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button onClick={onAdd}>추가</button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

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

              {/* ✅ 목표 선택 드롭다운 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>목표:</span>
                <select
                  value={it.goal_id ?? ""}               // 현재 연결된 목표
                  onChange={e => onAssignGoal(it.id, e.target.value)} // 변경 핸들러
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}