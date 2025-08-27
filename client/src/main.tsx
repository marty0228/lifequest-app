import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { supabase } from "./utils/supabase";
import { ensureMyProfile } from "./utils/profileDb";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

let ensuredOnce = false; // (핫리로드/중복 방지용, 선택)

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    if (ensuredOnce) return;     // 선택: 여러 번 실행 방지
    ensuredOnce = true;

    // ✅ 기다리지 말고 백그라운드로 실행
    ensureMyProfile(session.user.id, { xp: 0, level: 1 })
      .then(p => console.log("[ensureMyProfile] ok:", p))
      .catch(e => console.error("[ensureMyProfile] failed:", e));
  }
});