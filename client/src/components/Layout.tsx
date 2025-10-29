import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* 왼쪽 메뉴바 */}
      <nav
        style={{
          width: "200px",
          background: "#f5f5f5",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <NavLink
          to="/dashboard"
          end
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          대시보드
        </NavLink>

        <NavLink
          to="/tasks"
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          할 일
        </NavLink>

        <NavLink
          to="/goals"
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          목표
        </NavLink>

        {/* ⬇️ 시간표 항목 추가 */}
        <NavLink
          to="/timetable"
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          시간표
        </NavLink>

        {/* ✅ 습관 → 캘린더로 변경 */}
        <NavLink
          to="/calendar"
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          캘린더
        </NavLink>

        {/* ❌ 설정 숨김 (메뉴에서 제거) */}
        {/* <NavLink to="/settings">설정</NavLink> */}

        <NavLink
          to="/me"
          style={({ isActive }) => ({
            color: isActive ? "#4f46e5" : "#6366f1",
            fontWeight: isActive ? 700 : 500,
          })}
        >
          내 프로필
        </NavLink>
      </nav>

      {/* 오른쪽 페이지 */}
      <main style={{ flex: 1, padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}