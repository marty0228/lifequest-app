import { useEffect, useState } from "react";
import { listMyTasks, addTask, toggleTask, removeTask } from "../utils/tasksDb";
import { supabase } from "../utils/supabase";
import { listMyGoals, assignTaskToGoal } from "../utils/goalsDb";
import type { TaskRow, GoalRow } from "../types";
import { dueRemainLabel, endOfDayLocal, msUntilNextMidnight } from "../utils/time";

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
  DAY_BITS.forEach((bit, i) => {
    if (maskHas(mask, bit)) picked.push(DAY_LABELS[i]);
  });
  return picked.join(",");
}

// 계산형: 마감 지남 & 실패 여부 (DB 저장 없이 UI 계산)
function isFailedUI(it: TaskRow, now: Date) {
  if (!it.due_date) return false;
  if (it.done) return false;
  return now.getTime() > endOfDayLocal(it.due_date).getTime();
}

export default function Tasks() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>(""); // YYYY-MM-DD
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatMask, setRepeatMask] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  // now: 남은시간 라벨/자정 스위치용
  const [now, setNow] = useState<Date>(new Date());

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

  // ⏱ 남은시간 카운트다운: 매 분 now 갱신 (UI만 변함)
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // 🌙 자정에 즉시 리렌더(실패 표시 전환)
  useEffect(() => {
    // 마운트 시 1회 보정
    setNow(new Date());

    // 다음 자정에 한 번 실행 → 이후 24h 간격
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      const run = () => setNow(new Date());
      run();
      intervalId = window.setInterval(run, 24 * 60 * 60 * 1000);
    }, msUntilNextMidnight());

    // 탭 복귀 시 보정
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
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

  if (!authed) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <h2 style={{ marginBottom: 12 }}>로그인이 필요합니다</h2>
        <p style={{ color: "var(--color-text-tertiary)" }}>할 일을 관리하려면 먼저 로그인해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
        <h2>불러오는 중…</h2>
      </div>
    );
  }

  return (
    <section className="fade-in" style={{ display: "grid", gap: 20 }}>
      {/* 헤더 */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
        color: "white",
        padding: "32px 24px",
      }}>
        <h2 style={{ color: "white", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span>✅</span>
          <span>할 일 관리</span>
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 14 }}>
          당신의 모든 할 일을 한 곳에서 관리하세요
        </p>
      </div>

      {/* 입력 카드 */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>➕</span>
          <span>새 할 일 추가</span>
        </h3>

        <div style={{ display: "grid", gap: 12 }}>
          {/* 제목 입력 */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="무엇을 할까요?"
            onKeyDown={e => e.key === "Enter" && onAdd()}
          />

          {/* 마감일 & 반복 설정 버튼 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={{ flex: "1 1 160px" }}
            />
            <button 
              onClick={() => setRepeatOpen(o => !o)} 
              className={repeatMask ? "secondary" : "ghost"}
              style={{ flex: "0 0 auto" }}
            >
              🔄 반복 {repeatMask ? `(${prettyRepeat(repeatMask)})` : ""}
            </button>
            <button onClick={onAdd} style={{ flex: "0 0 auto" }}>
              추가하기
            </button>
          </div>

          {/* 반복 요일 선택 */}
          {repeatOpen && (
            <div style={{ 
              padding: 16,
              background: "var(--color-gray-50)",
              borderRadius: 12,
              display: "grid",
              gap: 12,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                반복할 요일을 선택하세요
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DAY_BITS.map((bit, i) => {
                  const active = maskHas(repeatMask, bit);
                  return (
                    <button
                      key={bit}
                      onClick={() => setRepeatMask(prev => toggleBit(prev, bit))}
                      className="secondary"
                      style={{
                        padding: "10px 16px",
                        background: active ? "var(--color-primary)" : "white",
                        color: active ? "white" : "var(--color-text-primary)",
                        fontWeight: active ? 600 : 400,
                        border: active ? "none" : "1.5px solid var(--color-gray-200)",
                      }}
                    >
                      {DAY_LABELS[i]}
                    </button>
                  );
                })}
                <button
                  onClick={() => setRepeatMask(0)}
                  className="ghost"
                  style={{ marginLeft: "auto" }}
                >
                  초기화
                </button>
              </div>
            </div>
          )}
        </div>
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

      {/* 할 일 목록 */}
      <div className="card">
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 20,
        }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📋</span>
            <span>할 일 목록</span>
          </h3>
          <span style={{
            background: "var(--color-primary)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 12,
          }}>
            {items.length}개
          </span>
        </div>

        {items.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: 60,
            color: "var(--color-text-tertiary)" 
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div>아직 할 일이 없어요</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>위에서 새 할 일을 추가해보세요!</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map(it => {
              const dueInfo = it.due_date ? dueRemainLabel(it.due_date, now) : null;
              const failed = isFailedUI(it, now);

              return (
                <div 
                  key={it.id} 
                  className="card"
                  style={{ 
                    padding: 16,
                    background: it.done ? "var(--color-gray-50)" : "white",
                    border: failed && !it.done ? "1.5px solid var(--color-danger)" : undefined,
                  }}
                >
                  {/* 상단: 체크박스 + 제목 + 삭제 */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: 12,
                    marginBottom: 12,
                  }}>
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={e => onToggle(it.id, e.target.checked)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 600,
                        fontSize: 15,
                        textDecoration: it.done ? "line-through" : "none",
                        color: it.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                      }}>
                        {it.title}
                        {failed && !it.done && (
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
                    </div>
                    <button
                      onClick={() => onDelete(it.id)}
                      className="ghost"
                      style={{ 
                        padding: "6px 10px",
                        color: "var(--color-danger)",
                        fontSize: 13,
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {/* 목표 연결 */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    marginBottom: 10,
                  }}>
                    <span style={{ 
                      fontSize: 12, 
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      minWidth: 50,
                    }}>
                      🎯 목표
                    </span>
                    <select
                      value={it.goal_id ?? ""}
                      onChange={e => onAssignGoal(it.id, e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">(연결 안 함)</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.title} {g.target_count ? `(${g.achieved_count}/${g.target_count})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 메타 정보 */}
                  <div style={{ 
                    display: "flex", 
                    gap: 16, 
                    flexWrap: "wrap",
                    fontSize: 12, 
                    color: "var(--color-text-tertiary)" 
                  }}>
                    {it.due_date && (
                      <>
                        <span>📅 마감: {it.due_date} 23:59</span>
                        <span style={{
                          fontWeight: dueInfo?.urgent ? 600 : 400,
                          color: dueInfo?.urgent ? "var(--color-danger)" : "var(--color-text-tertiary)",
                        }}>
                          ⏰ {dueInfo?.text}
                        </span>
                      </>
                    )}
                    {it.repeat_mask && (
                      <span>🔄 {prettyRepeat(it.repeat_mask)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
