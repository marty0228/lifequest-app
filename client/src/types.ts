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