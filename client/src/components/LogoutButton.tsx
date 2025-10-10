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

      // (선택) 앱 전역 캐시/스토어 정리
      sessionStorage.clear();
      localStorage.removeItem("some-app-cache"); // 있으면 정리

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
      className="px-3 py-2 rounded-md border"
      aria-label="로그아웃"
      title="로그아웃"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}