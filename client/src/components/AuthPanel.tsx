import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  async function signup() {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setMsg(error ? `회원가입 실패: ${error.message}` : "회원가입 메일을 확인하세요.");
  }

  async function login() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setMsg(error ? `로그인 실패: ${error.message}` : "로그인 성공");
  }

  async function logout() {
    await supabase.auth.signOut();
    setMsg("로그아웃 완료");
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={signup}>회원가입</button>
        <button onClick={login}>로그인</button>
        <button onClick={logout}>로그아웃</button>
      </div>
      <small>{msg}</small>
    </div>
  );
}