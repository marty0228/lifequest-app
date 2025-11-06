import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      sessionStorage.clear();
      localStorage.removeItem("some-app-cache");

      navigate("/login", { replace: true });
    } catch (e) {
      console.error(e);
      alert("로그아웃 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="secondary"
      style={{
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
      }}
      aria-label="로그아웃"
      title="로그아웃"
    >
      {loading ? "🔄" : "🚪"} {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}