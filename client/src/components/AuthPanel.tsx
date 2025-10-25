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

  // 🔎 마운트 시 1회, ENV 정리 후 실제 연결 가능한지 사전 검증
  useEffect(() => {
    (async () => {
      try {
        await assertSupabaseReachable();
      } catch (e: any) {
        const em = String(e?.message ?? e);
        setErr("초기 헬스체크 실패: Supabase 인증 서버 연결 안 됨 (ENV/네트워크 확인)");
        setRawErr(em);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setRawErr(null);
    setLoading(true);
    try {
      const call = mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password: pw })
        : supabase.auth.signUp({ email, password: pw });

      const { data, error } = await call;
      if (error) throw error;

      setMsg(mode === "signin"
        ? `로그인 성공: ${data.user?.email ?? ""}`
        : "가입 완료! 메일 인증이 필요한 경우 받은 편지함을 확인하세요.");
    } catch (e: any) {
      const em = String(e?.message ?? e);
      setRawErr(em);
      setErr(em.includes("Failed to fetch")
        ? "네트워크 오류: 인증 서버에 연결할 수 없습니다. (ENV URL, CORS, HTTPS, 확장프로그램/VPN 확인)"
        : em);
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
      setErr(em.includes("Failed to fetch") ? "네트워크 오류: 인증 서버에 연결할 수 없습니다." : em);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 420, color: "#111827" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setMode("signin")} disabled={mode === "signin"} style={{ ...tabBtn, ...(mode === "signin" ? tabActive : {}) }}>로그인</button>
        <button onClick={() => setMode("signup")} disabled={mode === "signup"} style={{ ...tabBtn, ...(mode === "signup" ? tabActive : {}) }}>회원가입</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input type="email" placeholder="이메일" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={input}/>
        <input type="password" placeholder="비밀번호" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} required style={input}/>
        <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "처리 중…" : mode === "signin" ? "로그인" : "가입하기"}</button>
      </form>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSignOut} disabled={loading} style={ghostBtn}>로그아웃</button>
      </div>

      {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}
      {rawErr && <div style={{ color: "#ef4444", fontSize: 12, wordBreak: "break-all" }}>원본 오류: {rawErr}</div>}

      <pre style={hintBox}>
{`ENV 체크
VITE_SUPABASE_URL: ${String(import.meta.env.VITE_SUPABASE_URL || "(없음)")}
VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? "(있음)" : "(없음)"}
origin: ${window.location.origin}`}
      </pre>
    </div>
  );
}

/* styles */
const tabBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" };
const tabActive: React.CSSProperties = { background: "#eef2ff", borderColor: "#c7d2fe", color: "#111827" };
const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "white", color: "#111827" };
const primaryBtn: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, border: "1px solid #6366f1", background: "#6366f1", color: "white", cursor: "pointer", fontWeight: 600 };
const ghostBtn: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" };
const hintBox: React.CSSProperties = { marginTop: 4, padding: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", color: "#111827" };