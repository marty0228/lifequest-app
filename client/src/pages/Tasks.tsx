// client/src/pages/Tasks.tsx
import { useEffect, useState } from "react";
import { listMyTasks, addTask, toggleTask, removeTask } from "../utils/tasksDb";
import type { TaskRow } from "../utils/tasksDb";
import { supabase } from "../utils/supabase";

export default function Tasks() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // 로그인 안 되어 있으면 안내
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAuthed(false);
          return;
        }
        setAuthed(true);
        const list = await listMyTasks();
        if (mounted) setItems(list);
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

  if (!authed) {
    return <section><p>로그인이 필요합니다.</p></section>;
  }
  if (loading) return <section><p>불러오는 중…</p></section>;

  return (
    <section style={{ maxWidth: 640, margin: "0 auto" }}>
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
            <li key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}