import { NavLink } from "react-router-dom";

const linkStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, display: "block" };
const active: React.CSSProperties = { background: "#efefef", fontWeight: 600 };

export default function Nav() {
  return (
    <nav style={{ display: "grid", gap: 8 }}>
      <NavLink to="/dashboard" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>��ú���</NavLink>
      <NavLink to="/tasks" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>����(����Ʈ)</NavLink>
      <NavLink to="/habits" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>����</NavLink>
      <NavLink to="/settings" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>����</NavLink>
    </nav>
  );
}