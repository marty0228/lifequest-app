// client/src/utils/goalsDb.ts
import { supabase } from "./supabase";
import type { GoalRow } from "../types";

async function assertAuthed(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("로그인이 필요합니다.");
}

/** 내 목표 목록 */
export async function listMyGoals(): Promise<GoalRow[]> {
  await assertAuthed();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GoalRow[];
}

/** 목표 추가 (user_id 보내지 않음) */
export async function addGoal(input: {
  title: string;
  scope: "short" | "long";
  start_date?: string | null;
  end_date?: string | null;
  target_count?: number;
}): Promise<GoalRow> {
  await assertAuthed();
  const payload = {
    title: input.title,
    scope: input.scope,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    target_count: input.target_count ?? 0,
  };
  const { data, error } = await supabase
    .from("goals")
    .insert([payload])        // ⚠️ user_id 제외
    .select("*")
    .single();
  if (error) throw error;
  return data as GoalRow;
}

/** 목표 수정 */
export async function updateGoal(id: string, input: Partial<{
  title: string;
  scope: "short" | "long";
  start_date: string | null;
  end_date: string | null;
  target_count: number;
}>): Promise<GoalRow> {
  await assertAuthed();
  const { data, error } = await supabase
    .from("goals")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as GoalRow;
}

/** 목표 삭제 */
export async function removeGoal(id: string): Promise<void> {
  await assertAuthed();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/** 할 일을 특정 목표에 연결/해제 */
export async function assignTaskToGoal(taskId: string, goalId: string | null) {
  await assertAuthed();
  const { data, error } = await supabase
    .from("tasks")
    .update({ goal_id: goalId })
    .eq("id", taskId)
    .select("id, goal_id")
    .single();
  if (error) throw error;
  return data as { id: string; goal_id: string | null };
}