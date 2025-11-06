import { NavLink, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "홈", icon: "🏠" },
  { to: "/tasks", label: "할 일", icon: "✅" },
  { to: "/goals", label: "목표", icon: "🎯" },
  { to: "/timetable", label: "시간표", icon: "📅" },
  { to: "/calendar", label: "캘린더", icon: "📆" },
  { to: "/me", label: "프로필", icon: "👤" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      minHeight: "100vh",
      background: "var(--color-bg)",
    }}>
      {/* 메인 콘텐츠 */}
      <main style={{ 
        flex: 1,
        paddingBottom: "80px", // 하단 네비게이션 공간
        overflowY: "auto",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
        }}>
          <Outlet />
        </div>
      </main>

      {/* 하단 네비게이션 (모바일 우선) */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--color-bg-card)",
          borderTop: "1px solid var(--color-gray-200)",
          display: "grid",
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          padding: "8px 0",
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
          zIndex: 1000,
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                padding: "8px 4px",
                textDecoration: "none",
                transition: "all 0.2s",
                color: isActive ? "var(--color-primary)" : "var(--color-text-tertiary)",
              }}
            >
              <span style={{ 
                fontSize: "20px",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.2s",
              }}>
                {item.icon}
              </span>
              <span style={{ 
                fontSize: "11px",
                fontWeight: isActive ? 600 : 400,
              }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}