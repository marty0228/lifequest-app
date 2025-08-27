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

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    const meta = session.user.user_metadata || {};
    await ensureMyProfile(session.user.id, {
      username: meta.user_name ?? null,
      displayName: meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.avatar_url ?? null,
    });
  }
});