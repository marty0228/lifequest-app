import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectItem } from "../components/ui/select";
import { Button } from "../components/ui/button";

type Course = {
  id: string;
  title: string;
  day: number;
  startTime: number;
  endTime: number;
  location?: string;
  color: string;
};

const DAYS = ["월", "화", "수", "목", "금"];
const START_HOUR = 9;
const END_HOUR = 18;
const ROW_HEIGHT = 60;

const COLORS = [
  { name: "인디고", value: "#6366f1" },
  { name: "퍼플", value: "#a855f7" },
  { name: "핑크", value: "#ec4899" },
  { name: "로즈", value: "#f43f5e" },
  { name: "오렌지", value: "#f97316" },
  { name: "옐로우", value: "#eab308" },
  { name: "그린", value: "#22c55e" },
  { name: "틸", value: "#14b8a6" },
];

const TimetablePage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "",
    day: 0,
    startTime: 9,
    endTime: 10,
    location: "",
    color: COLORS[0].value,
  });

  useEffect(() => {
    if (user) loadCourses();
  }, [user]);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("user_id", user!.id)
      .order("day", { ascending: true })
      .order("start_min", { ascending: true });
    
    console.log("📚 시간표 데이터:", data);
    console.log("❌ 에러:", error);
    
    if (data) {
      const mapped = data.map((c) => ({
        id: c.id,
        title: c.title,
        day: c.day,
        startTime: c.start_min / 60,
        endTime: c.end_min / 60,
        location: c.location,
        color: c.color,
      }));
      console.log("🎨 변환된 courses:", mapped);
      setCourses(mapped);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      day: 0,
      startTime: 9,
      endTime: 10,
      location: "",
      color: COLORS[0].value,
    });
    setIsOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title,
      day: course.day,
      startTime: course.startTime,
      endTime: course.endTime,
      location: course.location || "",
      color: course.color,
    });
    setIsOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    
    console.log("📝 제출 데이터:", form);
    
    if (editing) {
      const { data, error } = await supabase
        .from("timetable_entries")
        .update({
          title: form.title,
          day: form.day,
          start_min: Math.floor(form.startTime * 60),
          end_min: Math.floor(form.endTime * 60),
          location: form.location,
          color: form.color,
        })
        .eq("id", editing.id);
      console.log("✏️ 수정 결과:", { data, error });
    } else {
      const insertData = {
        user_id: user!.id,
        title: form.title,
        day: form.day,
        start_min: Math.floor(form.startTime * 60),
        end_min: Math.floor(form.endTime * 60),
        location: form.location || null,
        color: form.color,
      };
      console.log("🔵 DB에 저장할 데이터:", insertData);
      
      const { data, error } = await supabase
        .from("timetable_entries")
        .insert(insertData)
        .select();
      
      console.log("➕ 추가 결과 data:", data);
      console.log("❌ 추가 결과 error:", error);
      if (error) {
        console.error("🚨 에러 상세:", error.message, error.details, error.hint, error.code);
        alert(`추가 실패: ${error.message}`);
        return;
      }
    }
    setIsOpen(false);
    loadCourses();
  };

  const remove = async () => {
    if (editing) {
      await supabase.from("timetable_entries").delete().eq("id", editing.id);
      setIsOpen(false);
      loadCourses();
    }
  };

  const toSlot = (time: number) => Math.floor((time - START_HOUR) * 2);
  const ROWS = (END_HOUR - START_HOUR) * 2;

  console.log("📊 현재 courses 상태:", courses);

  return (
    <div className="page-container">
      <div className="gradient-header">
        <h1 className="page-title">📅 시간표</h1>
        <p className="page-subtitle">주간 수업 일정을 관리하세요</p>
      </div>

      <div className="content-container">
        <button onClick={openNew} className="btn btn-primary mb-4 w-full">
          ➕ 수업 추가하기
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px repeat(5, 1fr)",
            gridTemplateRows: `50px repeat(${ROWS}, ${ROW_HEIGHT}px)`,
            gap: 0,
            border: "1px solid var(--color-gray-200)",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          <div style={{ gridColumn: "1", gridRow: "1" }} />
          {DAYS.map((day, i) => (
            <div
              key={day}
              style={{
                gridColumn: i + 2,
                gridRow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                backgroundColor: "var(--color-gray-50)",
                borderBottom: "1px solid var(--color-gray-200)",
              }}
            >
              {day}
            </div>
          ))}

          {Array.from({ length: ROWS }).map((_, row) => (
            <div
              key={`time-${row}`}
              style={{
                gridColumn: 1,
                gridRow: row + 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "var(--color-gray-600)",
                borderRight: "1px solid var(--color-gray-200)",
                backgroundColor: "var(--color-gray-50)",
              }}
            >
              {row % 2 === 0 ? `${START_HOUR + row / 2}:00` : ""}
            </div>
          ))}

          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <div
                key={`cell-${row}-${col}`}
                style={{
                  gridColumn: col + 2,
                  gridRow: row + 2,
                  borderBottom: "1px solid var(--color-gray-100)",
                  borderRight: "1px solid var(--color-gray-100)",
                }}
              />
            ))
          )}

          {DAYS.map((_, dayIdx) => (
            <div
              key={`overlay-${dayIdx}`}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: `2 / ${2 + ROWS}`,
                display: "grid",
                gridTemplateRows: `repeat(${ROWS}, ${ROW_HEIGHT}px)`,
                position: "relative",
              }}
            >
              {courses
                .filter((c) => {
                  const match = c.day === dayIdx;
                  console.log(`📌 Day ${dayIdx}: ${c.title} (day=${c.day}) -> ${match}`);
                  return match;
                })
                .map((c) => {
                  const startSlot = Math.max(0, Math.min(ROWS, toSlot(c.startTime)));
                  const endSlot = Math.max(startSlot + 1, Math.min(ROWS, toSlot(c.endTime)));
                  console.log(`🎯 렌더링: ${c.title} - startSlot=${startSlot}, endSlot=${endSlot}, gridRow=${startSlot + 1} / ${endSlot + 1}`);
                  return (
                    <div
                      key={c.id}
                      onClick={() => openEdit(c)}
                      style={{
                        gridRow: `${startSlot + 1} / ${endSlot + 1}`,
                        margin: "2px 4px",
                        backgroundColor: c.color,
                        borderRadius: "8px",
                        padding: "8px",
                        color: "white",
                        fontSize: "12px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ fontWeight: "600", lineHeight: "1.2" }}>{c.title}</div>
                      {c.location && (
                        <div style={{ opacity: 0.9, marginTop: "4px", fontSize: "10px" }}>
                          {c.location}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>
              {editing ? "수업 수정" : "수업 추가"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  과목명
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 데이터베이스"
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  요일
                </label>
                <select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) })}
                  className="input"
                  style={{ width: "100%" }}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}요일
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    시작 시간
                  </label>
                  <select
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: parseFloat(e.target.value) })}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    {Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }).map((_, i) => {
                      const val = START_HOUR + i * 0.5;
                      const label = Number.isInteger(val) ? `${val}:00` : `${Math.floor(val)}:30`;
                      return (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    종료 시간
                  </label>
                  <select
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: parseFloat(e.target.value) })}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    {Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }).map((_, i) => {
                      const val = START_HOUR + i * 0.5;
                      const label = Number.isInteger(val) ? `${val}:00` : `${Math.floor(val)}:30`;
                      return (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  강의실 (선택)
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="예: 공학관 301호"
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  색상
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px" }}>
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, color: c.value })}
                      style={{
                        height: "40px",
                        borderRadius: "8px",
                        backgroundColor: c.value,
                        border: form.color === c.value ? "3px solid #000" : "2px solid transparent",
                        cursor: "pointer",
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                {editing && (
                  <button
                    onClick={remove}
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: "#ef4444",
                      color: "white",
                    }}
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={submit}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {editing ? "수정" : "추가"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetablePage;