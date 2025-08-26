import { supabase } from "./supabase";
import type { Task } from "../types";

const map = (r: any): Task => ({
  id: r.id,
  title: r.title,
  completed: r.completed,
  createdAt: r.created_at,
  dueDate: r.due_date ?? undefined,
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
  const { data, error } = await supabase
    .from("quests")
    .insert({ user_id: userId, title, due_date: dueDate })
    .select()
    .single();
  if (error) throw error;
  return map(data);
}

export async function toggleTask(id: string) {
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