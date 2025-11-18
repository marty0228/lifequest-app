import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import CalendarPage from "./pages/Calendar";
import ProfilePage from "./pages/Profilepage";
import GoalsPage from "./pages/Goals";
import TimetablePage from './pages/TimetablePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="me" element={<ProfilePage />} />

        {/* 레거시 경로 처리 */}
        <Route path="habits" element={<Navigate to="/calendar" replace />} />
        <Route path="settings" element={<Navigate to="/dashboard" replace />} />
        
        {/* 시간표 탭 추가 */}
        <Route path="timetable" element={<TimetablePage />} />

        <Route path="*" element={<div>Not Found</div>} />
      </Route>
    </Routes>
  );
}