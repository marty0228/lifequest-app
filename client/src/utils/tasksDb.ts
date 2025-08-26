// client/src/utils/tasksDb.ts
import { supabase } from "./supabase";
import type { Task } from "../types";

/** DB Row → FE Task 매핑 */
function mapRow(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    completed: r.completed,
    createdAt: r.created_at,            // timestamptz → string
    dueDate: r.due_date ?? undefined,   // date|null → string|undefined
  };
}

/** 공통: 에러를 사람이 읽기 쉽게 던지기 */
function throwIf(error: any) {
  if (error) {
    const msg = error?.message ?? JSON.stringify(error);
    throw new Error(msg);
  }
}

/** 내 퀘스트 목록 불러오기 */
export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("id, user_id, title, completed, due_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIf(error);
  return (data ?? []).map(mapRow);
}

/** 새 퀘스트 추가 (dueDate는 'YYYY-MM-DD' 문자열 또는 undefined) */
export async function addTask(userId: string, title: string, dueDate?: string): Promise<Task> {
  const payload: Record<string, any> = { user_id: userId, title };
  if (dueDate) payload.due_date = dueDate;

  const { data, error } = await supabase
    .from("quests")
    .insert(payload)
    .select("id, user_id, title, completed, due_date, created_at")
    .single();

  throwIf(error);
  return mapRow(data);
}

/** 완료 여부 토글 */
export async function toggleTask(id: string): Promise<Task> {
  // 현재 completed 값 조회
  const { data: cur, error: e1 } = await supabase
    .from("quests")
    .select("completed")
    .eq("id", id)
    .single();

  throwIf(e1);

  const { data, error } = await supabase
    .from("quests")
    .update({ completed: !cur!.completed })
    .eq("id", id)
    .select("id, user_id, title, completed, due_date, created_at")
    .single();

  throwIf(error);
  return mapRow(data);
}

/** (선택) 제목/마감일 수정 */
export async function updateTask(id: string, fields: { title?: string; dueDate?: string | null }): Promise<Task> {
  const patch: Record<string, any> = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.dueDate !== undefined) patch.due_date = fields.dueDate; // null 주면 마감일 제거

  const { data, error } = await supabase
    .from("quests")
    .update(patch)
    .eq("id", id)
    .select("id, user_id, title, completed, due_date, created_at")
    .single();

  throwIf(error);
  return mapRow(data);
}

/** (선택) 삭제 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("quests").delete().eq("id", id);
  throwIf(error);
}