// client/src/components/AuthPanel.tsx
import { useEffect, useState } from "react";
import { supabase, assertSupabaseReachable } from "../utils/supabase";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rawErr, setRawErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await assertSupabaseReachable();
      } catch (e: any) {
        const em = String(e?.message ?? e);
        if (!alive) return;
        setErr("초기 헬스체크 실패: Supabase 인증 서버 연결 안 됨 (ENV/네트워크 확인)");
        setRawErr(em);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;
        setAuthed(!!session);
        if (session) {
          setMsg(`로그인됨: ${session.user.email ?? session.user.id}`);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr("세션 확인 중 오류가 발생했습니다.");
        setRawErr(String(e?.message ?? e));
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) {
        setMsg(`로그인됨: ${session.user.email ?? session.user.id}`);
        setErr(null);
        setRawErr(null);
      } else {
        setMsg("로그아웃됨");
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setRawErr(null);
    setLoading(true);
    try {
      const call =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password: pw })
          : supabase.auth.signUp({ email, password: pw });

      const { data, error } = await call;
      if (error) throw error;

      // ✅ 로그인 성공 시 Extension에 userId 전달 (강화)
      if (mode === "signin" && data.user) {
        const userId = data.user.id;
        
        // 1초 후 다시 한번 전송 (확실하게)
        const sendUserId = () => {
          window.postMessage({
            type: 'LIFEQUEST_USER_ID',
            userId: userId,
          }, window.location.origin);
          console.log('[Auth] ✅ userId sent via postMessage:', userId);
        };
        
        sendUserId();
        setTimeout(sendUserId, 1000);
        setTimeout(sendUserId, 2000);
      }

      setMsg(
        mode === "signin"
          ? `로그인 성공: ${data.user?.email ?? ""}`
          : "가입 완료! 메일 인증이 필요한 경우 받은 편지함을 확인하세요."
      );
    } catch (e: any) {
      const em = String(e?.message ?? e);
      setRawErr(em);
      setErr(
        em.includes("Failed to fetch")
          ? "네트워크 오류: 인증 서버에 연결할 수 없습니다. (ENV URL, CORS, HTTPS, 확장프로그램/VPN 확인)"
          : em
      );
      console.error("[AuthPanel] error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setErr(null); setMsg(null); setRawErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMsg("로그아웃 되었습니다.");
    } catch (e: any) {
      const em = String(e?.message ?? e);
      setRawErr(em);
      setErr(
        em.includes("Failed to fetch")
          ? "네트워크 오류: 인증 서버에 연결할 수 없습니다."
          : em
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: "20px auto" }}>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "" : "secondary"}
          style={{ 
            flex: 1,
            background: mode === "signin" ? "var(--color-primary)" : "var(--color-gray-100)",
            color: mode === "signin" ? "white" : "var(--color-text-primary)",
          }}
        >
          로그인
        </button>
        <button
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "" : "secondary"}
          style={{ 
            flex: 1,
            background: mode === "signup" ? "var(--color-primary)" : "var(--color-gray-100)",
            color: mode === "signup" ? "white" : "var(--color-text-primary)",
          }}
        >
          회원가입
        </button>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <input
          type="email"
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "처리 중…" : mode === "signin" ? "🔑 로그인" : "✨ 가입하기"}
        </button>
      </form>

      {/* 로그아웃 버튼 */}
      <button 
        onClick={handleSignOut} 
        disabled={loading}
        className="secondary"
        style={{ width: "100%", marginBottom: 16 }}
      >
        🚪 로그아웃
      </button>

      {/* 상태 표시 */}
      {authed !== null && (
        <div style={{ 
          padding: 12,
          borderRadius: 10,
          background: authed ? "var(--color-success)" : "var(--color-gray-100)",
          color: authed ? "white" : "var(--color-text-secondary)",
          fontSize: 13,
          fontWeight: 600,
          textAlign: "center",
          marginBottom: 12,
        }}>
          {authed ? "✅ 로그인됨" : "❌ 비로그인"}
        </div>
      )}

      {/* 메시지 */}
      {msg && (
        <div style={{ 
          padding: 12,
          borderRadius: 10,
          background: "var(--color-primary)",
          color: "white",
          fontSize: 13,
          marginBottom: 12,
        }}>
          ℹ️ {msg}
        </div>
      )}

      {/* 에러 */}
      {err && (
        <div style={{ 
          padding: 12,
          borderRadius: 10,
          background: "var(--color-danger)",
          color: "white",
          fontSize: 13,
          marginBottom: 12,
        }}>
          ⚠️ {err}
        </div>
      )}

      {/* 원본 에러 (디버깅용) */}
      {rawErr && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ 
            cursor: "pointer", 
            fontSize: 12, 
            color: "var(--color-text-tertiary)",
            padding: 8,
          }}>
            원본 오류 보기
          </summary>
          <div style={{ 
            marginTop: 8,
            padding: 12,
            background: "var(--color-gray-50)",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--color-danger)",
            wordBreak: "break-all",
            fontFamily: "monospace",
          }}>
            {rawErr}
          </div>
        </details>
      )}

      {/* ENV 정보 (디버깅용) */}
      <details>
        <summary style={{ 
          cursor: "pointer", 
          fontSize: 12, 
          color: "var(--color-text-tertiary)",
          padding: 8,
        }}>
          환경 설정 보기
        </summary>
        <pre style={{ 
          marginTop: 8,
          padding: 12,
          background: "var(--color-gray-50)",
          borderRadius: 8,
          fontSize: 11,
          color: "var(--color-text-secondary)",
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
        }}>
{`VITE_SUPABASE_URL: ${String(import.meta.env.VITE_SUPABASE_URL || "(없음)")}
VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? "(있음)" : "(없음)"}
origin: ${window.location.origin}`}
        </pre>
      </details>
    </div>
  );
}