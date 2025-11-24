import { addTask } from './tasksDb';

export interface CosmosAssignment {
  id: string;
  title: string;
  dueDate: string;        // YYYY-MM-DD
  subject: string;        // 과목명
  description?: string;
}

/**
 * Cosmos 과제를 Tasks로 변환 및 추가
 */
export async function importCosmosAssignments(assignments: CosmosAssignment[]): Promise<void> {
  for (const assignment of assignments) {
    try {
      // 중복 체크 (선택사항 - cosmos_id로 관리하면 좋음)
      
      // Task 추가
      await addTask(
        `[${assignment.subject}] ${assignment.title}`,
        {
          due_date: assignment.dueDate,
          note: assignment.description || null,
          repeat_mask: null,  // 과제는 일회성
          goal_id: null,      // 나중에 자동 연결 가능
        }
      );
      
      console.log(`✅ Cosmos 과제 추가: ${assignment.title}`);
    } catch (error) {
      console.error(`❌ 과제 추가 실패: ${assignment.title}`, error);
    }
  }
}

/**
 * Cosmos에서 과제 가져오기 (예시)
 */
export async function fetchCosmosAssignments(): Promise<CosmosAssignment[]> {
  // 실제 Cosmos Extension API 호출
  // 여기서는 예시 데이터
  
  // TODO: 실제 Cosmos API 연동
  // const response = await fetch('https://cosmos-api/assignments');
  // return response.json();
  
  return [
    {
      id: 'cosmos_1',
      title: '웹프로그래밍 과제 #3',
      subject: '웹프로그래밍',
      dueDate: '2024-12-31',
      description: 'React로 Todo 앱 만들기',
    },
    {
      id: 'cosmos_2',
      title: '알고리즘 과제 #2',
      subject: '알고리즘',
      dueDate: '2024-12-25',
      description: '동적계획법 문제 풀이',
    },
  ];
}
