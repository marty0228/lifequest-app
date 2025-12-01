import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { fetchMyProfile, upsertMyProfile } from "../utils/profileDb";
import { listMyTasks } from "../utils/tasksDb";
import type { Profile, TaskRow } from "../types";
import LogoutButton from "../components/LogoutButton";
import AchievementsSection from "../components/AchievementsSection";
import { calculateAchievementProgress, checkAchievements } from "../utils/achievementUtils";

/** XP → 진행도(0~100)와 레벨/현재레벨내 XP 계산 */
function xpMetrics(xpRaw: number | null | undefined) {
  const xp = Math.max(0, xpRaw ?? 0);
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const progress = (xpInLevel / 100) * 100;
  return { xp, level, xpInLevel, progress };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isMounted = useRef(true);
  const unityRef = useRef<HTMLIFrameElement>(null);

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

      // 프로필과 Tasks 동시 로드
      const [p, taskList] = await Promise.all([
        fetchMyProfile(user.id),
        listMyTasks(),
      ]);

      if (!isMounted.current) return;

      // ✅ null 체크 추가
      if (!p) {
        setErr("프로필을 찾을 수 없습니다.");
        setProfile(null);
        return;
      }

      setProfile(p);
      setTasks(taskList);
      setEditUsername(p.username ?? "");
      setEditDisplayName(p.displayName ?? "");
      setEditAvatarUrl(p.avatarUrl ?? "");
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

  function postToUnity(msg: any) {
    unityRef.current?.contentWindow?.postMessage(msg, "*");
  }
    //프로필이 준비되면 XP/레벨/이름을 Unity로 동기화
  useEffect(() => {
    if (!profile) return;

    const { xp, level } = xpMetrics(profile.xp);
    const name =
      profile.displayName?.trim() ||
      profile.username?.trim() ||
      "Player";

    unityRef.current?.contentWindow?.postMessage(
      { toUnity: true, type: "SYNC_XP_LEVEL", xp, level, name },
      "*"
    );
  }, [profile]);

   // [ADDED] Unity → React 메시지 수신 (Unity가 READY 알리면 한 번 더 싱크)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object" || !data.fromUnity) return;

      if (data.event === "READY" && profile) {
        const { xp, level } = xpMetrics(profile.xp);
        const name =
          profile.displayName?.trim() ||
          profile.username?.trim() ||
          "Player";

        unityRef.current?.contentWindow?.postMessage(
          { toUnity: true, type: "SYNC_XP_LEVEL", xp, level, name },
          "*"
        );

        // 🔹 저장된 게임 상태가 있으면 Unity에 로드 요청
        const saved = localStorage.getItem("lifequest.gameState.v1");
        if (saved) {
          unityRef.current?.contentWindow?.postMessage(
            { toUnity: true, type: "LOAD_GAME_STATE", json: saved },
            "*"
          );
        }
      }

      // 🔹 Unity → React : GAME_STATE 수신 시 localStorage에 저장
      if (data.event === "GAME_STATE" && typeof data.json === "string") {
        try {
          localStorage.setItem("lifequest.gameState.v1", data.json);
        } catch (err) {
          console.error("게임 상태 저장 실패", err);
        }
      }
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [profile]);

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

  async function handleSaveProfile() {
    if (!profile) return;
    
    try {
      setSaving(true);
      const updated = await upsertMyProfile({
        id: profile.id,
        username: editUsername.trim() || null,
        displayName: editDisplayName.trim() || null,
        avatarUrl: editAvatarUrl.trim() || null,
      });
      setProfile(updated);
      setEditMode(false);
    } catch (e: any) {
      setErr(e?.message ?? "프로필 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profile || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    
    try {
      setUploading(true);
      
      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 프로필에 URL 저장
      setEditAvatarUrl(publicUrl);
      
    } catch (e: any) {
      setErr(e?.message ?? "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }

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

  // [수정] Tasks를 Quest 형식으로 변환
  const quests = tasks.map(task => ({
    id: task.id,
    title: task.title,
    category: task.title.includes('[') ? '학업' : '기타',  // [과목명] 형식이면 학업
    completed: task.done,
  }));

  const achievementProgress = calculateAchievementProgress(quests, level);
  const userAchievements = checkAchievements(achievementProgress);

  const completedQuests = quests.filter(q => q.completed).length;
  const totalQuests = quests.length;
  const questCompletionRate = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

  return (
    <section className="fade-in" style={{ display: "grid", gap: 20 }}>
      {/* 헤더 카드 */}
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
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  if (editMode) {
                    setEditUsername(profile.username ?? "");
                    setEditDisplayName(profile.displayName ?? "");
                    setEditAvatarUrl(profile.avatarUrl ?? "");
                  }
                  setEditMode(!editMode);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "2px solid rgba(255,255,255,0.4)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {editMode ? "✖️ 취소" : "✏️ 프로필 수정"}
              </button>
              <LogoutButton />
            </div>
          </div>

          {/* 프로필 수정 폼 */}
          {editMode && (
            <div style={{
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              backdropFilter: "blur(10px)",
            }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>프로필 정보 수정</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
                    프로필 사진
                  </label>
                  
                  {/* 파일 업로드 버튼 */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <label style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "2px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}>
                      <span>{uploading ? "⏳" : "📁"}</span>
                      <span>{uploading ? "업로드 중..." : "컴퓨터에서 선택"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadAvatar}
                        disabled={uploading}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>

                  {/* URL 직접 입력 (기존 기능 유지) */}
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "2px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                    }}
                  />
                  
                  {/* 미리보기 */}
                  {editAvatarUrl && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={editAvatarUrl}
                        alt="미리보기"
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: "50%",
                          border: "3px solid rgba(255,255,255,0.3)",
                        }}
                      />
                    </div>
                  )}
                  
                  <p style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                    💡 Tip: 컴퓨터에서 이미지를 선택하거나 URL을 직접 입력하세요
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
                    사용자 이름 (ID)
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="username123"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "2px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
                    표시 이름
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="홍길동"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "2px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                    }}
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    background: "rgba(16, 185, 129, 1)",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: 8,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    marginTop: 8,
                  }}
                >
                  {saving ? "저장 중..." : "✅ 저장하기"}
                </button>
              </div>
            </div>
          )}

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

      {/* 통계 카드 - 퀘스트 정보 추가 */}
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
            icon="✅" 
            label="완료 퀘스트" 
            value={String(completedQuests)}
            color="var(--color-success)"
          />
          <StatCard 
            icon="📈" 
            label="완료율" 
            value={`${questCompletionRate.toFixed(0)}%`}
            color="var(--color-info)"
          />
        </div>
      </div>

      {/* 게임 미리보기 카드 - 개선된 버전 */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "20px 24px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🎮</span>
              <span>게임 미리보기</span>
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              전체화면으로 플레이하고 XP를 획득하세요!
            </p>
          </div>
          <button
            onClick={() => navigate('/game')}
            style={{
              background: "rgba(255,255,255,0.25)",
              color: "white",
              border: "2px solid rgba(255,255,255,0.4)",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.35)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            전체화면으로 플레이 →
          </button>
        </div>

        {/* 게임 화면 미리보기 */}
        <div 
          style={{
            position: "relative",
            width: "100%",
            height: 400,
            background: "#000",
            cursor: "pointer",
            overflow: "hidden",
          }}
          onClick={() => navigate('/game')}
        >
          <iframe
            ref={unityRef}
            src="/unity/index.html?compact=1"
            title="LifeQuest Unity (Preview)"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: "none",
            }}
            onLoad={() => {
              unityRef.current?.contentWindow?.postMessage(
                { toUnity: true, type: "SET_VIEW_MODE", mode: "compact" },
                "*"
              );
                const { xp, level } = xpMetrics(profile.xp);
                const name =
                  profile.displayName?.trim() ||
                  profile.username?.trim() ||
                  "Player";

                unityRef.current?.contentWindow?.postMessage(
                  { toUnity: true, type: "SYNC_XP_LEVEL", xp, level, name },
                  "*"
                );
              
              const saved = localStorage.getItem("lifequest.gameState.v1");
              if (saved) {
                unityRef.current?.contentWindow?.postMessage(
                  { toUnity: true, type: "LOAD_GAME_STATE", json: saved },
                  "*"
                );
              }
            }}
          />
          
          {/* 클릭 유도 오버레이 */}
          <div 
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 32,
              opacity: 0,
              transition: "opacity 0.3s",
            }}
            className="game-preview-overlay"
          >
            <div style={{
              background: "rgba(255,255,255,0.95)",
              padding: "16px 32px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
              <span style={{ fontSize: 32 }}>🎮</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#333" }}>
                  클릭하여 게임 시작
                </p>
                <p style={{ fontSize: 12, margin: "4px 0 0", color: "#666" }}>
                  전체화면에서 더 재미있게 즐기세요!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 게임 통계 푸터 */}
        <div style={{
          background: "#f8f9fa",
          padding: "16px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 16,
          borderTop: "1px solid #e0e0e0",
        }}>
          <GameStatBox icon="⚔️" label="몬스터 처치" value="0" />
          <GameStatBox icon="💰" label="획득 골드" value="0" />
          <GameStatBox icon="🎯" label="최고 콤보" value="0" />
          <GameStatBox icon="⏱️" label="플레이 타임" value="0분" />
        </div>
      </div>

      {/* 업적 섹션 */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <AchievementsSection userAchievements={userAchievements} />
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

function GameStatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 3, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>{value}</div>
    </div>
  );
}