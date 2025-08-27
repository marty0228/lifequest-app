export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;  
  dueDate?: string;   
}

// Profile 타입 (Supabase profiles 테이블 매핑)
export type Profile = {
  id: string;               // auth.user.id (uuid)
  username: string | null;  // 예: 깃허브/닉네임 등
  displayName: string | null; // 화면 표시용 이름
  avatarUrl: string | null; // Supabase Storage 경로 또는 공개 URL
  createdAt: string | null;
  updatedAt: string | null;
};