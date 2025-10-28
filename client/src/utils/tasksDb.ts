// client/src/utils/tasksDb.ts
import { supabase } from "./supabase";
import type { TaskRow } from "../types";

/** (내부) 로그인 확인만, userId는 굳이 읽지 않아도 됨 */
async function assertAuthed(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("로그인이 필요합니다.");
}

/** 내 작업 목록 */
export async function listMyTasks(): Promise<TaskRow[]> {
  await assertAuthed();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

/** 작업 추가 — 두 형태 모두 지원:
 *  addTask(title, due, repeatMask?)
 *  addTask(title, { due_date, repeat_mask, note, goal_id })
 */
export async function addTask(
  title: string,
  arg2?: string | null | { due_date?: string | null; repeat_mask?: number | null; note?: string | null; goal_id?: string | null },
  arg3?: number | null
): Promise<TaskRow> {
  await assertAuthed();

  let due: string | null = null;
  let repeat: number | null = null;
  let note: string | null = null;
  let goal: string | null = null;

  if (typeof arg2 === "string" || arg2 === null || arg2 === undefined) {
    due = (arg2 ?? null) as any;
    repeat = (arg3 ?? null) as any;
  } else if (typeof arg2 === "object") {
    due = arg2.due_date ?? null;
    repeat = arg2.repeat_mask ?? null;
    note = arg2.note ?? null;
    goal = arg2.goal_id ?? null;
  }

  const payload: any = { title };
  if (due !== null) payload.due_date = due;           // YYYY-MM-DD 문자열
  if (repeat !== null && repeat !== 0) payload.repeat_mask = repeat;
  if (note !== null) payload.note = note;
  if (goal !== null) payload.goal_id = goal;

  // ⚠️ user_id는 보내지 않음 → DB가 auth.uid()로 자동 채움
  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

/** 완료 토글 */
export async function toggleTask(id: string, nextDone: boolean): Promise<TaskRow> {
  await assertAuthed();
  const { data, error } = await supabase
    .from("tasks")
    .update({ done: nextDone })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TaskRow;
}

/** 부분 업데이트 */
export async function updateTask(
  id: string,
  fields: Partial<Pick<TaskRow, "title" | "note" | "due_date" | "repeat_mask" | "goal_id" | "done">>
): Promise<TaskRow> {
  await assertAuthed();
  const patch: Record<string, unknown> = {};
  if (typeof fields.title === "string") patch.title = fields.title;
  if (fields.note !== undefined) patch.note = fields.note;
  if (fields.due_date !== undefined) patch.due_date = fields.due_date;
  if (fields.repeat_mask !== undefined) patch.repeat_mask = fields.repeat_mask;
  if (fields.goal_id !== undefined) patch.goal_id = fields.goal_id;
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
  await assertAuthed();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}