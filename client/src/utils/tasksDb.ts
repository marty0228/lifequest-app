import { supabase } from "./supabase";

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  due_date: string | null;   // 'YYYY-MM-DD'
  done: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// 내 Tasks 불러오기(최신 먼저)
export async function listMyTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, note, due_date, done, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as TaskRow[];
}

// 추가
export async function addTask(title: string, opts?: { note?: string; due_date?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  const payload = {
    user_id: user.id,
    title,
    note: opts?.note ?? null,
    due_date: opts?.due_date ?? null,
  };
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, user_id, title, note, due_date, done, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as TaskRow;
}

// 완료 토글
export async function toggleTask(id: string, done: boolean) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .select("id, user_id, title, note, due_date, done, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as TaskRow;
}

// 삭제
export async function removeTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}