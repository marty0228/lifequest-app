// client/src/utils/tasksDb.ts
// fetch/자체 백엔드 호출 없이, Supabase JS로만 DB 접근합니다.
// 이렇게 하면 CORS/프록시/프리플라이트 이슈가 사라집니다.

import { supabase } from "./supabase";
import type { AddTaskOpts, TaskRow } from "../types";

/** 현재 로그인 사용자 ID를 안전하게 얻기 */
async function getUserIdOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("로그인이 필요합니다.");
  return uid;
}

/** 내 작업 목록 */
export async function listMyTasks(): Promise<TaskRow[]> {
  // RLS가 켜져 있으면 user_id 조건 없이도 내 것만 조회됩니다.
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // created_at/due_date가 문자열로 오지 않으면 문자열로 보정(안전)
  return (data ?? []).map((r) => ({
    ...r,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
    due_date: r.due_date ?? null,
  })) as TaskRow[];
}

/** 작업 추가 */
export async function addTask(title: string, opts: AddTaskOpts = {}): Promise<TaskRow> {
  const uid = await getUserIdOrThrow();

  const payload = {
    user_id: uid,
    title,
    note: opts.note ?? null,
    due_date: opts.due_date ?? null,
    repeat_mask: opts.repeat_mask ?? null,
    goal_id: opts.goal_id ?? null,
    done: false,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 완료 토글 */
export async function toggleTask(id: string, nextDone: boolean): Promise<TaskRow> {
  await getUserIdOrThrow(); // 로그인 확인

  const { data, error } = await supabase
    .from("tasks")
    .update({ done: nextDone })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 제목/마감 등 업데이트(부분 업데이트) */
export async function updateTask(
  id: string,
  fields: Partial<Pick<TaskRow, "title" | "note" | "due_date" | "repeat_mask" | "goal_id" | "done">>
): Promise<TaskRow> {
  await getUserIdOrThrow();

  const patch: Record<string, unknown> = {};
  if (typeof fields.title === "string") patch.title = fields.title;
  if (fields.note !== undefined) patch.note = fields.note;
  if (fields.due_date !== undefined) patch.due_date = fields.due_date; // null 허용
  if (fields.repeat_mask !== undefined) patch.repeat_mask = fields.repeat_mask; // null 허용
  if (fields.goal_id !== undefined) patch.goal_id = fields.goal_id; // null 허용
  if (typeof fields.done === "boolean") patch.done = fields.done;

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 삭제 */
export async function removeTask(id: string): Promise<void> {
  await getUserIdOrThrow();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}