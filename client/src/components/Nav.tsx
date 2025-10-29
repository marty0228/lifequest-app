import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/tasks", label: "할 일" },
  { to: "/goals", label: "목표" },
  { to: "/calendar", label: "캘린더" }, // ✅ 습관 → 캘린더
  // { to: "/settings", label: "설정" }, // ✅ 숨김/삭제
  { to: "/me", label: "내 프로필" },
];

export default function Nav() {
  return (
    <nav className="flex flex-col gap-6 p-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          className={({ isActive }) =>
            `text-[17px] ${
              isActive ? "text-indigo-600 font-semibold" : "text-indigo-500"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}