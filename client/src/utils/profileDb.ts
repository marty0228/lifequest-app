import { supabase } from "./supabase";
import type { Profile } from "../types";

// DB 레코드를 앱에서 쓰는 Profile 타입으로 매핑
function mapRowToProfile(row: any): Profile {
  if (!row) return {
    id: "",
    username: null,
    displayName: null,
    avatarUrl: null,
    createdAt: null,
    updatedAt: null,
  };
  return {
    id: row.id,
    username: row.username ?? null,
    displayName: row.full_name ?? row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * 내 프로필 가져오기
 * - userId: session.user.id
 */
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, display_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToProfile(data);
}

/**
 * 내 프로필 생성/수정 (upsert)
 * - 필요한 필드만 넘겨도 됨(나머지는 그대로 유지)
 */
export async function upsertMyProfile(input: {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<Profile> {
  const payload: any = {
    id: input.id,
    // undefined로 주면 기존 값 유지, null은 진짜 null로 업데이트
    username: input.username === undefined ? undefined : input.username,
    full_name: input.displayName === undefined ? undefined : input.displayName,
    avatar_url: input.avatarUrl === undefined ? undefined : input.avatarUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, username, full_name, display_name, avatar_url, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapRowToProfile(data);
}

/**
 * 아바타 업로드 (Supabase Storage 'avatars' 버킷 가정)
 * - 반환: 저장된 파일의 "공개 URL"
 * - 버킷이 public이 아니면 getPublicUrl로 공개 URL 발급
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  // 업로드
  const { error: uploadErr } = await supabase
    .storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) throw uploadErr;

  // 공개 URL 획득
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl; // 이 값을 avatarUrl로 저장하면 됨
}

/**
 * 로그인 직후 기본 프로필 보장 (없으면 생성)
 * - 소셜 로그인 메타데이터로 초기화
 */
export async function ensureMyProfile(userId: string, seed?: {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await fetchMyProfile(userId);
  if (existing) return existing;

  return upsertMyProfile({
    id: userId,
    username: seed?.username ?? null,
    displayName: seed?.displayName ?? null,
    avatarUrl: seed?.avatarUrl ?? null,
  });
}