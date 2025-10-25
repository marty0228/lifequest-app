// client/src/utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

/** 숨은 문자/따옴표/트레일링 슬래시 정리 */
function sanitizeEnvUrl(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // 따옴표/백틱 제거
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) || (s.startsWith("`") && s.endsWith("`"))) {
    s = s.slice(1, -1);
  }
  // Zero-width / BOM 등 제거
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // 공백 제거
  s = s.replace(/\s+/g, "");
  // 끝 슬래시 제거
  s = s.replace(/\/+$/, "");
  return s;
}

function sanitizeEnvKey(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) || (s.startsWith("`") && s.endsWith("`"))) {
    s = s.slice(1, -1);
  }
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return s;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const url = sanitizeEnvUrl(rawUrl);
const anon = sanitizeEnvKey(rawKey);

// 최소 형태 검사 (오타/스페이스 방지)
const urlOk = /^https:\/\/[a-z0-9]{20,}\.supabase\.co$/i.test(url);
if (!urlOk || !anon) {
  const msg = [
    "[Supabase ENV 오류]",
    `VITE_SUPABASE_URL: ${String(rawUrl)}`,
    `정규식 검사 통과 여부: ${urlOk}`,
    "예시: https://<project-ref>.supabase.co",
    "VITE_SUPABASE_ANON_KEY: (생략)",
  ].join("\n");
  console.error(msg);
  throw new Error(msg);
}

/** createClient 전에 fetch를 한 번 강제 확인(동기적 throw 방지) */
export async function assertSupabaseReachable(): Promise<void> {
  const healthUrl = `${url}/auth/v1/health`;
  const res = await fetch(healthUrl, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`[Supabase 연결 실패] ${res.status} ${res.statusText} - ${txt}`);
  }
}

// 필요하다면 커스텀 fetch 주입 가능(여기선 기본 fetch 사용)
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "lifequest.auth",
  },
  global: {
    headers: { "x-client-app": "lifequest" },
  },
});