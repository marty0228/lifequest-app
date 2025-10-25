// client/src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

type SupaUser = NonNullable<
  Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]
>;

export function useAuth() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 최대 3초 안에 loading을 반드시 내리도록 타임아웃
    const timeoutMs = 3000;
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const init = (async () => {
      try {
        // getSession은 로컬 스토리지 기반이라 네트워크 불필요. 실패시 null.
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setUser(data.session?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // 타임아웃과 경합: 어떤 게 먼저 끝나도 loading은 내려감
    Promise.race([init, timeout]).then(() => {
      if (!cancelled) setLoading(false);
    });

    // 상태 변경 구독 (StrictMode에서도 안전: 이 이펙트는 cleanup 후 재실행됨)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      try {
        sub.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  return { user, loading };
}