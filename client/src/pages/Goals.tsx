import { useEffect,  useState } from "react";
import { supabase } from "../utils/supabase";
import {
  listMyGoals, addGoal, updateGoal, removeGoal,
  type GoalRow
} from "../utils/goalsDb";

type GoalView = GoalRow & { progress: number }; // 0~100

function toView(g: GoalRow): GoalView {
  const target = Math.max(0, g.target_count ?? 0);
  const achieved = Math.max(0, g.achieved_count ?? 0);
  const progress = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  return { ...g, progress };
}

export default function GoalsPage() {
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<GoalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"short" | "long">("short");
  const [target, setTarget] = useState<number>(5); // 기본 5개

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) { setAuthed(false); return; }
        setAuthed(true);

        const rows = await listMyGoals();
        if (mounted) setItems(rows.map(toView));
      } catch (e: any) {
        setErr(e?.message ?? "목표 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const row = await addGoal({ title: title.trim(), scope, target_count: target });
      setItems(prev => [toView(row), ...prev]);
      setTitle("");
    } catch (e: any) {
      setErr(e?.message ?? "추가 실패");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await removeGoal(id);
      setItems(prev => prev.filter(g => g.id !== id));
    } catch (e: any) {
      setErr(e?.message ?? "삭제 실패");
    }
  };

  const onEditTarget = async (g: GoalView) => {
    const t = window.prompt("새 목표 개수(숫자)", String(g.target_count ?? 0));
    if (t === null) return;
    const newTarget = Math.max(0, parseInt(t || "0", 10));
    try {
      const row = await updateGoal(g.id, { target_count: newTarget });
      setItems(prev => prev.map(x => (x.id === g.id ? toView(row) : x)));
    } catch (e: any) {
      setErr(e?.message ?? "수정 실패");
    }
  };

  if (loading) return <section style={{ padding: 16 }}>불러오는 중…</section>;
  if (!authed) return <section style={{ padding: 16 }}>로그인이 필요합니다.</section>;

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      <header style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginBottom: 8 }}>목표(Goals)</h2>
        <form onSubmit={onAdd} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="목표 제목" style={{ flex: 1, minWidth: 240 }} />
          <select value={scope} onChange={e => setScope(e.target.value as any)}>
            <option value="short">단기</option>
            <option value="long">장기</option>
          </select>
          <input type="number" value={target} min={0} onChange={e => setTarget(Number(e.target.value))} style={{ width: 100 }} />
          <button type="submit">추가</button>
        </form>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {items.length === 0 ? (
          <div style={{ color: "#6b7280" }}>아직 목표가 없어요.</div>
        ) : (
          items.map(g => (
            <article key={g.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{g.title} <span style={{ color: "#6b7280", fontSize: 12 }}>({g.scope === "short" ? "단기" : "장기"})</span></div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    진행: {g.achieved_count}/{g.target_count} ({g.progress}%)
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEditTarget(g)} style={{ fontSize: 12 }}>목표수정</button>
                  <button onClick={() => onDelete(g.id)} style={{ fontSize: 12, color: "#ef4444" }}>삭제</button>
                </div>
              </div>

              <div style={{ marginTop: 8, height: 10, background: "#f3f4f6", borderRadius: 999 }}>
                <div style={{ width: `${g.progress}%`, height: "100%", background: "#10b981", borderRadius: 999, transition: "width .2s" }} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}