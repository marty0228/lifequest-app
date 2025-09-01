import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { fetchMyProfile } from "../utils/profileDb";
import type { Profile } from "../types";

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

  async function load() {
    try {
      setRefreshing(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        setErr("로그인이 필요합니다.");
        setProfile(null);
        return;
      }
      const p = await fetchMyProfile(user.id);
      setProfile(p);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "프로필을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      await load();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <section style={{ padding: 16 }}><p>불러오는 중…</p></section>;
  }

  if (err) {
    return (
      <section style={{ padding: 16 }}>
        <p style={{ color: "crimson" }}>{err}</p>
        <button onClick={load} style={{ marginTop: 8 }}>다시 시도</button>
      </section>
    );
  }

  if (!profile) {
    return (
      <section style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 8 }}>내 프로필</h2>
        <p>프로필이 아직 없습니다. (로그인 직후 자동 생성 설정을 확인해 주세요)</p>
        <button onClick={load} style={{ marginTop: 8 }} disabled={refreshing}>
          {refreshing ? "새로고침…" : "새로고침"}
        </button>
      </section>
    );
  }

  const { xp, level, xpInLevel, progress } = xpMetrics(profile.xp);

  return (
    <section
      style={{
        maxWidth: 680,
        margin: "24px auto",
        padding: 16,
        border: "1px solid #eee",
        borderRadius: 12
      }}
    >
      <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <img
          src={profile.avatarUrl ?? "https://placehold.co/96x96?text=No+Avatar"}
          alt="avatar"
          width={96}
          height={96}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ lineHeight: 1.6 }}>
          <div><strong>표시 이름:</strong> {profile.displayName ?? "미설정"}</div>
          <div><strong>아이디(닉):</strong> {profile.username ?? "미설정"}</div>
          <div><strong>UID:</strong> {profile.id}</div>
          {profile.createdAt && <div><strong>생성일:</strong> {new Date(profile.createdAt).toLocaleString()}</div>}
          {profile.updatedAt && <div><strong>수정일:</strong> {new Date(profile.updatedAt).toLocaleString()}</div>}
        </div>
      </header>

      {/* XP / 레벨 카드 */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Progress</div>
          <div style={{ color: "#6b7280" }}>Lv.{level} · {xpInLevel}/100 XP (총 {xp} XP)</div>
        </div>

        <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999 }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#6366f1",
              borderRadius: 999,
              transition: "width .25s"
            }}
          />
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          다음 레벨까지 {100 - xpInLevel} XP
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={load} disabled={refreshing}>
          {refreshing ? "새로고침…" : "새로고침"}
        </button>
      </div>
    </section>
  );
}