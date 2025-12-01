import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { fetchMyProfile } from "../utils/profileDb";
import type { Profile } from "../types";

/** XP → 레벨 계산 */
function xpMetrics(xpRaw: number | null | undefined) {
  const xp = Math.max(0, xpRaw ?? 0);
  const level = Math.floor(xp / 100) + 1;
  return { xp, level };
}

export default function GamePage() {
  const navigate = useNavigate();
  const unityRef = useRef<HTMLIFrameElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 게임 통계
  const [gameStats, setGameStats] = useState({
    monstersDefeated: 0,
    totalDamage: 0,
    playtime: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (!user) {
        navigate('/');
        return;
      }
      
      const p = await fetchMyProfile(user.id);
      setProfile(p);
    } catch (e) {
      console.error('프로필 로드 실패:', e);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  function postToUnity(msg: any) {
    unityRef.current?.contentWindow?.postMessage(msg, "*");
  }

  // Unity 메시지 수신
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data;
      if (!data?.fromUnity) return;

      switch (data.event) {
        case "READY":
          syncToUnity();
          break;
        case "XP_GAINED":
          handleXPGain(data.xpAmount);
          break;
        case "COMBAT_STATS":
          setGameStats(data.stats);
          break;
        case "GAME_STATE":
          if (typeof data.json === "string") {
            try {
              localStorage.setItem("lifequest.gameState.v1", data.json);
            } catch (err) {
              console.error("게임 상태 저장 실패", err);
            }
          }
          break;
      }
    };
    
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [profile]);

function syncToUnity() {
  if (!profile) return;
  const { xp, level } = xpMetrics(profile.xp);

  const name =
    profile.displayName?.trim() ||
    profile.username?.trim() ||
    "Player";

    // 1) 프로필 정보 먼저
    postToUnity({ toUnity: true, type: "SYNC_XP_LEVEL", xp, level, name });

    // 2) full 모드 설정
    postToUnity({ toUnity: true, type: "SET_VIEW_MODE", mode: "full" });

    // 3) 저장된 게임 상태 로드
    const saved = localStorage.getItem("lifequest.gameState.v1");
    if (saved) {
      postToUnity({ toUnity: true, type: "LOAD_GAME_STATE", json: saved });
    }
  }

  async function handleXPGain(amount: number) {
    if (!profile) return;
    
    try {
      const newXP = (profile.xp || 0) + amount;
      
      const { error } = await supabase
        .from('profiles')
        .update({ xp: newXP })
        .eq('id', profile.id);
      
      if (error) throw error;

      setProfile({ ...profile, xp: newXP });
      
      // Unity에 업데이트된 XP/레벨 동기화
      const { level } = xpMetrics(newXP);
      const name =
      profile.displayName?.trim() ||
      profile.username?.trim() ||
      "Player";

    postToUnity({
      toUnity: true,
      type: "SYNC_XP_LEVEL",
      xp: newXP,
      level,
      name,
    });
      
      // 알림 표시 (나중에 toast 라이브러리로 교체)
      console.log(`🎮 게임에서 ${amount} XP 획득!`);
    } catch (e) {
      console.error('XP 업데이트 실패:', e);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        height: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#000",
        color: "white",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎮</div>
          <h2>게임 로딩 중...</h2>
        </div>
      </div>
    );
  }

  const { xp, level } = profile ? xpMetrics(profile.xp) : { xp: 0, level: 1 };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      background: "#000",
      overflow: "hidden",
    }}>
      {/* 상단 HUD */}
      <div style={{
        background: "rgba(0,0,0,0.9)",
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "2px solid #333",
        backdropFilter: "blur(10px)",
      }}>
        <button
          onClick={() => navigate('/me')}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          ← 프로필로
        </button>
        
        {/* 플레이어 정보 */}
        <div style={{ 
          display: "flex", 
          gap: 32, 
          color: "white",
          alignItems: "center",
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            background: "rgba(255,255,255,0.1)",
            padding: "8px 16px",
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>레벨</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{level}</div>
            </div>
          </div>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            background: "rgba(255,255,255,0.1)",
            padding: "8px 16px",
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 20 }}>⭐</span>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>XP</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{xp}</div>
            </div>
          </div>
        </div>

        {/* 게임 통계 */}
        <div style={{ display: "flex", gap: 24, color: "white", fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚔️</span>
            <span>{gameStats.monstersDefeated}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>💥</span>
            <span>{gameStats.totalDamage}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>⏱️</span>
            <span>{Math.floor(gameStats.playtime / 60)}분</span>
          </div>
        </div>
      </div>

      {/* Unity 게임 */}
      <div style={{ flex: 1, position: "relative" }}>
        <iframe
          ref={unityRef}
          src="/unity/index.html"
          title="LifeQuest Unity Game"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          onLoad={syncToUnity}
        />
      </div>
    </div>
  );
}
