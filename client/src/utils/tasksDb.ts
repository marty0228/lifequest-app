// client/src/utils/tasksDb.ts
import { supabase } from "./supabase";

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  due_date: string | null;   // 'YYYY-MM-DD'
  done: boolean;
  goal_id?: string | null;   // 목표 연결용
  created_at: string | null;
  updated_at: string | null;
};

/** 내 Tasks 불러오기 (로그인 안 되어 있으면 빈 배열 반환) */
export async function listMyTasks(): Promise<TaskRow[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) return []; // 로그인 전엔 빈 목록

  const { data, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, note, due_date, done, goal_id, created_at, updated_at")
    .eq("user_id", user.id) // 안전 필터
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

/** 추가 */
export async function addTask(title: string, opts?: { note?: string; due_date?: string | null; goal_id?: string | null }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("로그인이 필요합니다.");

  const payload = {
    user_id: user.id,
    title,
    note: opts?.note ?? null,
    due_date: opts?.due_date ?? null,
    goal_id: opts?.goal_id ?? null,
    done: false,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, user_id, title, note, due_date, done, goal_id, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 수정 (부분 업데이트) */
export async function updateTask(
  id: string,
  patch: Partial<Pick<TaskRow, "title" | "note" | "due_date" | "goal_id" | "done">>
): Promise<TaskRow> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id) // 안전 필터
    .select("id, user_id, title, note, due_date, done, goal_id, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 완료 토글 */
export async function toggleTask(id: string, done: boolean) {
  return updateTask(id, { done });
}

/** 삭제 */
export async function removeTask(id: string) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // 안전 필터

  if (error) throw error;
}

/** 하위호환 별칭(기존 코드 보호용) */
export const deleteTask = removeTask;
export const listTasks = listMyTasks;