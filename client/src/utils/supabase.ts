// client/src/utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

const RAW_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const RAW_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 약간의 정리
const url = (RAW_URL ?? "").trim().replace(/\/+$/, "");
const anon = (RAW_KEY ?? "").trim();

if (!url || !anon) {
  console.warn(
    "[Supabase ENV 경고] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 비어 있습니다. " +
    ".env.local을 확인하고 개발 서버를 재시작하세요."
  );
}

// 절대 global.headers.Authorization = Bearer <anon> 같은 건 넣지 마세요.
// (로그인 토큰을 덮어써서 RLS가 전부 막힙니다.)
export const supabase = createClient(url || "https://example.supabase.co", anon || "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "lifequest.auth",
  },
});

// 개발 편의: 콘솔 디버깅
if (import.meta.env.DEV) (window as any).supabase = supabase;

/** ✅ 호환용: AuthPanel.tsx 등에서 임포트하는 헬스체크 함수 */
export async function assertSupabaseReachable(): Promise<void> {
  if (!url || !anon) {
    throw new Error("Supabase ENV가 비어 있습니다. .env.local을 확인하세요.");
  }
  const healthUrl = `${url}/auth/v1/health`;
  const res = await fetch(healthUrl, {
    method: "GET",
    headers: {
      apikey: anon,             // Authorization 헤더는 절대 강제하지 않음
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`[Supabase 연결 실패] ${res.status} ${res.statusText} - ${txt}`);
  }
  // OK면 아무 것도 하지 않음
}

console.log("[Supabase] url:", url ? url : "(EMPTY)", " anon:", anon ? (anon.slice(0,10)+"…") : "(EMPTY)");