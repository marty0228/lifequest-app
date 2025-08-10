import { NavLink } from "react-router-dom";

const linkStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, display: "block" };
const active: React.CSSProperties = { background: "#efefef", fontWeight: 600 };

export default function Nav() {
  return (
    <nav style={{ display: "grid", gap: 8 }}>
      <NavLink to="/dashboard" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>대시보드</NavLink>
      <NavLink to="/tasks" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>할일(퀘스트)</NavLink>
      <NavLink to="/habits" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>습관</NavLink>
      <NavLink to="/settings" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>설정</NavLink>
    </nav>
  );
}