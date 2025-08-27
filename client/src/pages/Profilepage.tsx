import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { fetchMyProfile } from "../utils/profileDb";
import type { Profile } from "../types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErr("로그인이 필요합니다.");
          return;
        }
        const p = await fetchMyProfile(user.id);
        if (mounted) setProfile(p);
      } catch (e: any) {
        setErr(e.message ?? "프로필을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (loading) return <section><p>불러오는 중…</p></section>;
  if (err) return <section><p style={{ color: "crimson" }}>{err}</p></section>;
  if (!profile) return <section><p>프로필이 아직 없습니다.</p></section>;

  return (
    <section style={{ maxWidth: 560, margin: "24px auto", padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>내 프로필</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <img
          src={profile.avatarUrl ?? "https://placehold.co/96x96?text=No+Avatar"}
          alt="avatar"
          width={96}
          height={96}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <div><strong>표시 이름:</strong> {profile.displayName ?? "미설정"}</div>
          <div><strong>아이디(닉):</strong> {profile.username ?? "미설정"}</div>
          <div><strong>UID:</strong> {profile.id}</div>
          {profile.createdAt && <div><strong>생성일:</strong> {new Date(profile.createdAt).toLocaleString()}</div>}
          {profile.updatedAt && <div><strong>수정일:</strong> {new Date(profile.updatedAt).toLocaleString()}</div>}
        </div>
      </div>
    </section>
  );
}