import { useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabase";
import { fetchMyProfile } from "../utils/profileDb";
import type { Profile } from "../types";
import LogoutButton from "../components/LogoutButton";

/** XP → 진행도(0~100)와 레벨/현재레벨내 XP 계산 */
function xpMetrics(xpRaw: number | null | undefined) {
  const xp = Math.max(0, xpRaw ?? 0);
  const level = Math.floor(xp / 100) + 1;      // 0~99: 1레벨, 100~199: 2레벨, ...
  const xpInLevel = xp % 100;                   // 현재 레벨 내 누적치 0~99
  const progress = (xpInLevel / 100) * 100;     // 게이지 %
  return { xp, level, xpInLevel, progress };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 언마운트 안전 가드
  const isMounted = useRef(true);

  async function load() {
    try {
      setRefreshing(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (!user) {
        if (!isMounted.current) return;
        setErr("로그인이 필요합니다.");
        setProfile(null);
        return;
      }

      const p = await fetchMyProfile(user.id);
      if (!isMounted.current) return;

      setProfile(p);
      setErr(null);
    } catch (e: any) {
      if (!isMounted.current) return;
      setErr(e?.message ?? "프로필을 불러오지 못했습니다.");
    } finally {
      if (!isMounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      await load();
    })();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
        <h2>불러오는 중…</h2>
      </div>
    );
  }

  if (err) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>❌</div>
        <h2 style={{ marginBottom: 12, color: "var(--color-danger)" }}>{err}</h2>
        <button onClick={load}>다시 시도</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <section className="fade-in" style={{ display: "grid", gap: 20 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>👤</div>
          <h2 style={{ marginBottom: 12 }}>내 프로필</h2>
          <p style={{ color: "var(--color-text-tertiary)", marginBottom: 20 }}>
            프로필이 아직 없습니다. (로그인 직후 자동 생성 설정을 확인해 주세요)
          </p>
          <button onClick={load} disabled={refreshing}>
            {refreshing ? "새로고침 중..." : "새로고침"}
          </button>
          <div style={{ marginTop: 20 }}>
            <LogoutButton />
          </div>
        </div>
      </section>
    );
  }

  const { xp, level, xpInLevel, progress } = xpMetrics(profile.xp);

  return (
    <section className="fade-in" style={{ display: "grid", gap: 20 }}>
      {/* 헤더 카드 - 그라데이션 */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
        color: "white",
        padding: "32px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 장식 요소 */}
        <div style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 150,
          height: 150,
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute",
          bottom: -40,
          left: -40,
          width: 180,
          height: 180,
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src={profile.avatarUrl ?? "https://placehold.co/80x80?text=👤"}
                alt="avatar"
                width={80}
                height={80}
                style={{ 
                  borderRadius: "50%", 
                  objectFit: "cover",
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              />
              <div>
                <h2 style={{ color: "white", marginBottom: 4, fontSize: 24 }}>
                  {profile.displayName ?? "사용자"}
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 14, marginBottom: 4 }}>
                  @{profile.username ?? "미설정"}
                </p>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  display: "inline-block",
                }}>
                  Lv.{level}
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>

          {/* XP 프로그레스 */}
          <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 12,
            padding: 16,
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>경험치</span>
              <span style={{ fontSize: 13 }}>
                {xpInLevel}/100 XP (총 {xp} XP)
              </span>
            </div>
            <div style={{ 
              height: 12, 
              background: "rgba(255, 255, 255, 0.2)", 
              borderRadius: 999,
              overflow: "hidden",
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: "100%",
                background: "linear-gradient(90deg, #10B981 0%, #34D399 100%)",
                borderRadius: 999, 
                transition: "width 0.5s ease-out",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
              }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              🎯 다음 레벨까지 {100 - xpInLevel} XP
            </div>
          </div>
        </div>
      </div>

      {/* 상세 정보 카드 */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📋</span>
          <span>상세 정보</span>
        </h3>
        <div style={{ display: "grid", gap: 12 }}>
          <InfoRow label="사용자 ID" value={profile.id} icon="🆔" />
          <InfoRow 
            label="생성일" 
            value={profile.createdAt ? new Date(profile.createdAt).toLocaleString("ko-KR") : "-"} 
            icon="📅"
          />
          <InfoRow 
            label="최근 수정" 
            value={profile.updatedAt ? new Date(profile.updatedAt).toLocaleString("ko-KR") : "-"} 
            icon="🕐"
          />
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📊</span>
          <span>나의 통계</span>
        </h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
        }}>
          <StatCard 
            icon="🏆" 
            label="레벨" 
            value={String(level)}
            color="var(--color-primary)"
          />
          <StatCard 
            icon="⭐" 
            label="총 경험치" 
            value={String(xp)}
            color="var(--color-warning)"
          />
          <StatCard 
            icon="📈" 
            label="진행률" 
            value={`${progress}%`}
            color="var(--color-success)"
          />
        </div>
      </div>

      {/* 새로고침 버튼 */}
      <button 
        onClick={load} 
        disabled={refreshing}
        className="secondary"
        style={{ width: "100%" }}
      >
        {refreshing ? "🔄 새로고침 중..." : "🔄 새로고침"}
      </button>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center",
      gap: 12,
      padding: 12,
      background: "var(--color-gray-50)",
      borderRadius: 10,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: 20,
      background: `${color}10`,
      borderRadius: 12,
      textAlign: "center",
      border: `2px solid ${color}20`,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
        {label}
      </div>
    </div>
  );
}