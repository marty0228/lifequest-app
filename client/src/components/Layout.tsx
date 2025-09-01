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
        <NavLink to="/dashboard">대시보드</NavLink>
        <NavLink to="/tasks">할 일</NavLink>
        <NavLink to="/goals">목표</NavLink>
        <NavLink to="/habits">습관</NavLink>
        <NavLink to="/settings">설정</NavLink>
        <NavLink to="/me">내 프로필</NavLink>
      </nav>

      {/* 오른쪽 페이지 */}
      <main style={{ flex: 1, padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}