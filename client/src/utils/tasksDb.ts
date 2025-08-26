// client/src/utils/tasksDb.ts
import { supabase } from "./supabase";
import type { Task } from "../types";

// DB Row → 프론트 Task 매핑
const map = (r: any): Task => ({
  id: r.id,
  title: r.title,
  completed: r.completed,
  createdAt: r.created_at,      // DB: created_at → FE: createdAt
  dueDate: r.due_date ?? undefined, // DB: due_date → FE: dueDate
});

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(map);
}

export async function addTask(userId: string, title: string, dueDate?: string) {
  const payload: any = { user_id: userId, title };
  if (dueDate) payload.due_date = dueDate; // yyyy-mm-dd 문자열 OK

  const { data, error } = await supabase
    .from("quests")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return map(data);
}

export async function toggleTask(id: string) {
  // 현재 completed 값 조회 후 반전
  const { data: cur, error: e1 } = await supabase
    .from("quests")
    .select("completed")
    .eq("id", id)
    .single();
  if (e1) throw e1;

  const { data, error } = await supabase
    .from("quests")
    .update({ completed: !cur.completed })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return map(data);
}