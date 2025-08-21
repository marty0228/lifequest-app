import { useState } from "react";

export default function ServerCheck() {
  const [msg, setMsg] = useState("");

  const checkServer = async () => {
    try {
      const res = await fetch("/healthz");
      if (!res.ok) throw new Error("서버 응답 오류");
      const data = await res.json();
      setMsg(JSON.stringify(data));
    } catch (err) {
      setMsg("서버 연결 실패 ❌");
    }
  };

  return (
    <div>
      <button
        onClick={checkServer}
        style={{
          padding: "6px 12px",
          background: "#6366f1",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        서버 상태 확인
      </button>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}