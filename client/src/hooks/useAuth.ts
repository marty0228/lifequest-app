// client/src/hooks/useAuth.ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabase";

type SupaUser = NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>;

export function useAuth() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 중복 초기화/중복 구독 방지
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    let mounted = true;

    // ✅ getSession이 지연/실패해도 최대 3초 내로 loading을 내리도록 타임아웃 처리
    const timeoutMs = 3000;
    const sessionPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession(); // 로컬 세션 조회(네트워크 불필요)
        return data.session?.user ?? null;
      } catch {
        return null; // 실패해도 일단 비로그인으로 진입
      }
    })();

    const timer = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    (async () => {
      // getSession vs 타이머 중 먼저 끝나는 쪽을 채택
      const u = (await Promise.race([sessionPromise, timer])) as SupaUser | null;
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      // 안전하게 구독 해제
      try {
        sub.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  return { user, loading };
}