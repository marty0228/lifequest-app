// src/pages/TimetablePage.tsx
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus } from 'lucide-react';

export interface Course {
  id: string;
  title: string;
  color: string;
  day: number;
  startTime: number; // 9 = 9:00, 9.5 = 9:30
  endTime: number;
  location?: string;
}

const DAYS = ['월', '화', '수', '목', '금'];
const TIME_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const COLORS = [
  { name: '빨강', value: '#FF6B6B' },
  { name: '청록', value: '#4ECDC4' },
  { name: '파랑', value: '#5B8DEE' },
  { name: '오렌지', value: '#FFA94D' },
  { name: '보라', value: '#B197FC' },
  { name: '초록', value: '#51CF66' },
  { name: '핑크', value: '#FF6BCB' },
  { name: '노랑', value: '#FFD93D' },
];

const TimetablePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    day: 0,
    startTime: 9,
    endTime: 10,
    color: COLORS[0].value,
    location: '',
  });

  const openAddDialog = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      day: 0,
      startTime: 9,
      endTime: 10,
      color: COLORS[0].value,
      location: '',
    });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      day: course.day,
      startTime: course.startTime,
      endTime: course.endTime,
      color: course.color,
      location: course.location || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    const courseData: Course = {
      id: editingCourse?.id || uuid(),
      title: formData.title,
      day: formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
      location: formData.location,
    };

    if (editingCourse) {
      setCourses(courses.map(course => course.id === editingCourse.id ? courseData : course));
    } else {
      setCourses([...courses, courseData]);
    }

    setIsAddDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingCourse) {
      setCourses(courses.filter(course => course.id !== editingCourse.id));
      setIsAddDialogOpen(false);
    }
  };

  const getCoursePosition = (course: Course) => {
    const startRow = TIME_SLOTS.indexOf(Math.floor(course.startTime));
    const duration = course.endTime - course.startTime;
    const height = duration * 60; // Adjusting the height calculation to ensure space between courses
    
    return {
      top: startRow * 60 + (course.startTime % 1) * 60,
      height,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-1">시간표</h1>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-white text-indigo-600 hover:bg-indigo-50"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            수업 추가
          </Button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Days Header */}
              <div className="flex border-b border-gray-200">
                <div className="w-16 flex-shrink-0 bg-gray-50"></div>
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[80px] text-center py-3 bg-gray-50 border-l border-gray-200"
                  >
                    <span className="text-sm text-gray-700">{day}</span>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <div className="relative">
                <div className="flex">
                  {/* Time Labels */}
                  <div className="w-16 flex-shrink-0">
                    {TIME_SLOTS.map((time) => (
                      <div
                        key={time}
                        className="h-[60px] flex items-start justify-center pt-1 border-b border-gray-100"
                      >
                        <span className="text-xs text-gray-500">{time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {DAYS.map((day, dayIndex) => (
                    <div
                      key={day}
                      className="flex-1 min-w-[80px] relative border-l border-gray-200"
                    >
                      {/* Hour Grid Lines */}
                      {TIME_SLOTS.map((time) => (
                        <div
                          key={time}
                          className="h-[60px] border-b border-gray-100"
                        ></div>
                      ))}

                      {/* Course Blocks */}
                      {courses
                        .filter((course) => course.day === dayIndex)
                        .map((course) => {
                          const { top, height } = getCoursePosition(course);
                          return (
                            <div
                              key={course.id}
                              onClick={() => openEditDialog(course)}
                              className="absolute left-1 right-1 rounded-md p-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                backgroundColor: course.color,
                              }}
                            >
                              <div className="text-white text-xs leading-tight">
                                <div className="break-words">{course.title}</div>
                                {course.location && (
                                  <div className="opacity-90 mt-1 text-[10px]">
                                    {course.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? '수업 편집' : '수업 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">과목명</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 자료구조"
              />
            </div>

            <div>
              <Label htmlFor="day">요일</Label>
              <Select
                value={formData.day.toString()}
                onValueChange={(value) => setFormData({ ...formData, day: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue>{DAYS[formData.day]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, index) => (
                    <SelectItem key={day} value={index.toString()}>
                      {day}요일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">시작 시간</Label>
                <Select
                  value={formData.startTime.toString()}
                  onValueChange={(value) => setFormData({ ...formData, startTime: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue>{formData.startTime}:00</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <>
                        <SelectItem key={time} value={time.toString()}>
                          {time}:00
                        </SelectItem>
                        <SelectItem key={`${time}-30`} value={(time + 0.5).toString()}>
                          {time}:30
                        </SelectItem>
                      </>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="endTime">종료 시간</Label>
                <Select
                  value={formData.endTime.toString()}
                  onValueChange={(value) => setFormData({ ...formData, endTime: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue>{formData.endTime}:00</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <>
                        <SelectItem key={time} value={time.toString()}>
                          {time}:00
                        </SelectItem>
                        <SelectItem key={`${time}-30`} value={(time + 0.5).toString()}>
                          {time}:30
                        </SelectItem>
                      </>
                    ))}
                    <SelectItem value="19">19:00</SelectItem>
                    <SelectItem value="19.5">19:30</SelectItem>
                    <SelectItem value="20">20:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">강의실 (선택)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="예: 공학관 301호"
              />
            </div>

            <div>
              <Label>색상</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`h-10 rounded-md border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-gray-800 scale-105'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {editingCourse && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="flex-1"
                >
                  삭제
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {editingCourse ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetablePage;