import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Habits from "./pages/Calendar";
import Settings from "./pages/Settings";
import ProfilePage from "./pages/Profilepage";
import GoalsPage from "./pages/Goals";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* 기본 접속 시 대시보드로 리다이렉트 */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="habits" element={<Habits />} />
        <Route path="settings" element={<Settings />} />
        <Route path="me" element={<ProfilePage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="*" element={<div>Not Found</div>} />
      </Route>
    </Routes>
  );
}