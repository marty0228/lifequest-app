import { useEffect,  useState } from "react";
import { supabase } from "../utils/supabase";
import {
  listMyGoals, addGoal, updateGoal, removeGoal,
} from "../utils/goalsDb";
import type { GoalRow } from "../types";

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

  if (loading) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
        <h2>불러오는 중…</h2>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <h2 style={{ marginBottom: 12 }}>로그인이 필요합니다</h2>
        <p style={{ color: "var(--color-text-tertiary)" }}>
          목표를 관리하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <section className="fade-in" style={{ display: "grid", gap: 20 }}>
      {/* 헤더 카드 */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
        color: "white",
        padding: "32px 24px",
      }}>
        <h2 style={{ color: "white", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span>🎯</span>
          <span>목표 관리</span>
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 14 }}>
          단기 및 장기 목표를 설정하고 달성해보세요
        </p>
      </div>

      {/* 목표 추가 카드 */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>➕</span>
          <span>새 목표 추가</span>
        </h3>
        <form onSubmit={onAdd} style={{ display: "grid", gap: 12 }}>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="목표 제목을 입력하세요" 
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select 
              value={scope} 
              onChange={e => setScope(e.target.value as any)}
              style={{ flex: "1 1 120px" }}
            >
              <option value="short">📅 단기 목표</option>
              <option value="long">🏆 장기 목표</option>
            </select>
            <input 
              type="number" 
              value={target} 
              min={0} 
              onChange={e => setTarget(Number(e.target.value))}
              placeholder="목표 개수"
              style={{ flex: "1 1 120px" }}
            />
            <button type="submit" style={{ flex: "0 0 auto" }}>
              추가하기
            </button>
          </div>
        </form>
      </div>

      {/* 에러 메시지 */}
      {err && (
        <div style={{
          padding: 16,
          background: "var(--color-danger)",
          color: "white",
          borderRadius: 12,
          fontWeight: 500,
        }}>
          ⚠️ {err}
        </div>
      )}

      {/* 목표 목록 */}
      <div style={{ display: "grid", gap: 12 }}>
        {items.length === 0 ? (
          <div className="card" style={{ 
            textAlign: "center", 
            padding: 60,
            color: "var(--color-text-tertiary)" 
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div>아직 목표가 없어요</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>위에서 새 목표를 추가해보세요!</div>
          </div>
        ) : (
          items.map(g => (
            <article 
              key={g.id} 
              className="card"
              style={{
                padding: 20,
                background: g.progress === 100 
                  ? "linear-gradient(135deg, #FA709A 0%, #FEE140 100%)"
                  : "white",
                color: g.progress === 100 ? "white" : "var(--color-text-primary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 18,
                      color: g.progress === 100 ? "white" : "var(--color-text-primary)",
                    }}>
                      {g.title}
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: g.progress === 100 
                        ? "rgba(255, 255, 255, 0.3)" 
                        : (g.scope === "short" ? "var(--color-primary)" : "var(--color-secondary)"),
                      color: "white",
                    }}>
                      {g.scope === "short" ? "단기" : "장기"}
                    </span>
                    {g.progress === 100 && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.3)",
                        color: "white",
                      }}>
                        🏆 달성!
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: 14,
                    color: g.progress === 100 ? "rgba(255, 255, 255, 0.9)" : "var(--color-text-secondary)",
                  }}>
                    진행: {g.achieved_count}/{g.target_count} ({g.progress}%)
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button 
                    onClick={() => onEditTarget(g)}
                    className="ghost"
                    style={{ 
                      fontSize: 13,
                      padding: "8px 12px",
                      color: g.progress === 100 ? "white" : "var(--color-primary)",
                      background: g.progress === 100 ? "rgba(255, 255, 255, 0.2)" : "transparent",
                    }}
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => onDelete(g.id)}
                    className="ghost"
                    style={{ 
                      fontSize: 13,
                      padding: "8px 12px",
                      color: g.progress === 100 ? "white" : "var(--color-danger)",
                      background: g.progress === 100 ? "rgba(255, 255, 255, 0.2)" : "transparent",
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 프로그레스 바 */}
              <div style={{ 
                height: 12, 
                background: g.progress === 100 ? "rgba(255, 255, 255, 0.3)" : "var(--color-gray-100)",
                borderRadius: 999,
                overflow: "hidden",
              }}>
                <div style={{ 
                  width: `${g.progress}%`, 
                  height: "100%",
                  background: g.progress === 100 
                    ? "rgba(255, 255, 255, 0.7)" 
                    : "linear-gradient(90deg, var(--color-success) 0%, #34D399 100%)",
                  borderRadius: 999, 
                  transition: "width 0.5s ease-out",
                  boxShadow: g.progress === 100 
                    ? "none"
                    : "0 2px 8px rgba(16, 185, 129, 0.3)",
                }} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}