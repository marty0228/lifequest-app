import { supabase } from "./supabase";
import type { Profile } from "../types";

// DB → 앱 모델 매핑
function mapRowToProfile(row: any): Profile {
  if (!row) {
    return {
      id: "",
      username: null,
      displayName: null,
      avatarUrl: null,
      xp: null,
      level: null,
      createdAt: null,
      updatedAt: null,
    };
  }
  return {
    id: row.user_id ?? row.id ?? "",
    username: row.username ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    xp: typeof row.xp === "number" ? row.xp : row.xp ?? null,
    level: typeof row.level === "number" ? row.level : row.level ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/** 내 프로필 가져오기 (user_id 기준) */
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, xp, level, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToProfile(data);
}

/** 내 프로필 upsert (user_id 충돌 기준) */
export async function upsertMyProfile(input: {
  id: string;
  xp?: number | null;
  level?: number | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<Profile> {
  const payload: any = {
    user_id: input.id,
    updated_at: new Date().toISOString(),
  };

  if (input.xp !== undefined) payload.xp = input.xp;
  if (input.level !== undefined) payload.level = input.level;
  if (input.username !== undefined) payload.username = input.username;
  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, username, display_name, avatar_url, xp, level, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapRowToProfile(data);
}

/** (옵션) 로그인 직후 기본 프로필 보장 */
export async function ensureMyProfile(
  userId: string,
  seed?: {
    xp?: number | null;
    level?: number | null;
    // 아래는 현재 테이블에 없음(무시)
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  }
): Promise<Profile> {
  const existing = await fetchMyProfile(userId);
  if (existing) return existing;

  return upsertMyProfile({
    id: userId,
    xp: seed?.xp ?? 0,
    level: seed?.level ?? 1,
  });
}