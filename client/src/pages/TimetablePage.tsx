import { useState } from "react";
import { v4 as uuid } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectItem } from "../components/ui/select";
import { Plus } from "lucide-react";

type Course = {
  id: string;
  title: string;
  color: string;
  day: number;         // 0=월 ... 4=금
  startTime: number;   // 9 = 09:00, 9.5 = 09:30
  endTime: number;     // 10.5 = 10:30 ...
  location?: string;
};

const DAYS = ["월", "화", "수", "목", "금"];
const START_HOUR = 9;
const END_HOUR = 18;
const STEP_MIN = 30;
const ROWS = (END_HOUR - START_HOUR) * (60 / STEP_MIN); // 18
const ROW_HEIGHT = 44;                                   // 30분 한 칸 높이
const TIME_COL_WIDTH = 64;

const COLORS = [
  { name: "빨강", value: "#FF6B6B" },
  { name: "청록", value: "#4ECDC4" },
  { name: "파랑", value: "#5B8DEE" },
  { name: "오렌지", value: "#FFA94D" },
  { name: "보라", value: "#B197FC" },
  { name: "초록", value: "#51CF66" },
  { name: "핑크", value: "#FF6BCB" },
  { name: "노랑", value: "#FFD93D" },
];

// 시간(예: 9.5) -> 30분 슬롯 인덱스(정수)
const toSlot = (t: number) => Math.round((t - START_HOUR) * 2);
// 슬롯 -> 레이블(정각만 표시)
const hourLabel = (rowIdx: number) => (rowIdx % 2 === 0 ? String(START_HOUR + rowIdx / 2) : "");

const TimetablePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const [form, setForm] = useState({
    title: "",
    day: 0,
    startTime: 9,
    endTime: 10,
    color: COLORS[0].value,
    location: "",
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", day: 0, startTime: 9, endTime: 10, color: COLORS[0].value, location: "" });
    setIsOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      day: c.day,
      startTime: c.startTime,
      endTime: c.endTime,
      color: c.color,
      location: c.location ?? "",
    });
    setIsOpen(true);
  };

  const submit = () => {
    if (!form.title.trim()) return;

    // 30분 단위로 강제 스냅(입력 실수 방지)
    const s = Math.round(form.startTime * 2) / 2;
    const e = Math.round(form.endTime * 2) / 2;

    const payload: Course = {
      id: editing?.id ?? uuid(),
      title: form.title.trim(),
      day: Number(form.day), // 혹시 문자열이 들어와도 숫자로 강제
      startTime: s,
      endTime: Math.max(e, s + 0.5), // 최소 30분
      color: form.color,
      location: form.location || undefined,
    };

    setCourses((prev) => (editing ? prev.map((x) => (x.id === editing.id ? payload : x)) : [...prev, payload]));
    setIsOpen(false);
  };

  const remove = () => {
    if (!editing) return;
    setCourses((prev) => prev.filter((x) => x.id !== editing.id));
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6">
        <h1 className="text-4xl font-extrabold tracking-tight">시간표</h1>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          수업 추가
        </Button>
      </div>

      {/* 메인 그리드 */}
      <div
        className="mx-6 rounded-lg bg-white shadow ring-1 ring-black/5 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(5, 1fr)`,
          gridTemplateRows: `40px repeat(${ROWS}, ${ROW_HEIGHT}px)`,
          position: "relative",
        }}
      >
        {/* 좌상단 빈칸 */}
        <div className="border-b border-r border-gray-200 bg-gray-50" />

        {/* 요일 헤더 */}
        {DAYS.map((d, i) => (
          <div
            key={d}
            className="border-b border-r border-gray-200 bg-gray-50 flex items-center justify-center text-sm font-medium text-gray-700"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {d}
          </div>
        ))}

        {/* 시간 라벨 */}
        {Array.from({ length: ROWS }).map((_, row) => (
          <div
            key={`time-${row}`}
            className="border-b border-r border-gray-100 flex items-start justify-center pt-1 text-xs text-gray-500"
            style={{ gridColumn: 1, gridRow: row + 2 }}
          >
            {hourLabel(row)}
          </div>
        ))}

        {/* 기본 셀(격자선) */}
        {DAYS.map((_, col) =>
          Array.from({ length: ROWS }).map((__, row) => (
            <div
              key={`cell-${col}-${row}`}
              className="border-b border-r border-gray-100"
              style={{ gridColumn: col + 2, gridRow: row + 2 }}
            />
          ))
        )}

        {/* Day 컬럼별 오버레이(여기에 과목을 "행"으로 붙임) */}
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
              .filter((c) => Number(c.day) === dayIdx) // 👈 안전하게 숫자로 비교
              .map((c) => {
                const startSlot = Math.max(0, Math.min(ROWS, toSlot(c.startTime)));
                const endSlot = Math.max(startSlot + 1, Math.min(ROWS, toSlot(c.endTime)));

                return (
                  <div
                    key={c.id}
                    onClick={() => openEdit(c)}
                    className="rounded-md p-2 text-white text-xs cursor-pointer shadow-sm overflow-hidden"
                    style={{
                      gridRow: `${startSlot + 1} / ${endSlot + 1}`, // 👈 정확히 행 범위로 배치
                      margin: "2px 4px",
                      backgroundColor: c.color,
                    }}
                    title={`${c.title} • ${c.location ?? ""}`}
                  >
                    <div className="font-semibold leading-tight">{c.title}</div>
                    {c.location && <div className="opacity-90 mt-1 text-[10px]">{c.location}</div>}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      {/* 추가/편집 다이얼로그 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "수업 편집" : "수업 추가"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">과목명</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 자료구조"
              />
            </div>

            <div>
              <Label htmlFor="day">요일</Label>
              <Select
                value={String(form.day)}
                onValueChange={(v) => setForm({ ...form, day: parseInt(v, 10) })}
                className="w-full"
              >
                {DAYS.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}요일
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">시작 시간</Label>
                <Select
                  value={String(form.startTime)}
                  onValueChange={(v) => setForm({ ...form, startTime: parseFloat(v) })}
                  className="w-full"
                >
                  {Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }).map((_, i) => {
                    const val = START_HOUR + i * 0.5;
                    const label = Number.isInteger(val) ? `${val}:00` : `${Math.floor(val)}:30`;
                    return (
                      <SelectItem key={`s-${val}`} value={String(val)}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>

              <div>
                <Label htmlFor="end">종료 시간</Label>
                <Select
                  value={String(form.endTime)}
                  onValueChange={(v) => setForm({ ...form, endTime: parseFloat(v) })}
                  className="w-full"
                >
                  {Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }).map((_, i) => {
                    const val = START_HOUR + i * 0.5;
                    const label = Number.isInteger(val) ? `${val}:00` : `${Math.floor(val)}:30`;
                    return (
                      <SelectItem key={`e-${val}`} value={String(val)}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">강의실(선택)</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="예: 공학관 301호"
              />
            </div>

            <div>
              <Label>색상</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`h-8 rounded-md border-2 ${
                      form.color === c.value ? "border-gray-900" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editing && (
                <Button onClick={remove} variant="destructive" className="flex-1">
                  삭제
                </Button>
              )}
              <Button onClick={submit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                {editing ? "수정" : "추가"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetablePage;