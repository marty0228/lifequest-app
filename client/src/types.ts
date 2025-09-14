export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;  
  dueDate?: string;   
}

// Profile 타입 (Supabase profiles 테이블 매핑)
export type Profile = {
  id: string;                 // = DB의 user_id
  username?: string | null;   // (테이블에 없으니 null로 매핑)
  displayName?: string | null;// (테이블에 없으니 null로 매핑)
  avatarUrl?: string | null;  // (테이블에 없으니 null로 매핑)
  xp?: number | null;         // ✅ 추가
  level?: number | null;      // ✅ 추가
  createdAt?: string | null;  // (테이블에 없으면 null)
  updatedAt?: string | null;
};

//할 일 추가할 때 날짜 데이터
export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  due_date: string | null;       // 'YYYY-MM-DD'
  repeat_mask: number | null;    // 0~127, 요일 비트마스크
  done: boolean;
  goal_id: string | null;        // null 가능, 목표 연결용
  created_at: string | null;
  updated_at: string | null;
};

export type AddTaskOpts = {
  note?: string | null;
  due_date?: string | null;        // e.g. '2025-09-14'
  goal_id?: string | null;
  repeat_mask?: number | null;     // e.g. 월/수/금 = 1+4+16 = 21
};
