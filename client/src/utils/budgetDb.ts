// client/src/utils/budgetDb.ts
import { supabase } from "./supabase";

/** ---------- Types (DB rows) ---------- */
export type BudgetMonthlyRow = {
  id: string;
  user_id: string;
  month: string;       // 'YYYY-MM'
  cap: number;         // 월 상한
  created_at: string | null;
};

export type BudgetWeeklyRow = {
  id: string;
  user_id: string;
  month: string;       // 'YYYY-MM'
  week_no: number;     // 1..6
  limit_amount: number;
};

export type ExpenseRow = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: string | null;
  memo: string | null;
  spent_at: string;      // 'YYYY-MM-DD'
  created_at: string | null;
};

/** ---------- Helpers ---------- */
async function getUserIdOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("로그인이 필요합니다.");
  return uid;
}

export function monthKeyOf(date: Date): string {
  return date.toISOString().slice(0, 7); // 'YYYY-MM'
}

export function clampToMonth(dayIso: string, monthKey: string): boolean {
  return dayIso.startsWith(monthKey);
}

/** 월의 주(월~일) 구간을 계산. monthKey = 'YYYY-MM'
 *  - 주 시작: 월요일
 *  - 주 끝: 일요일
 *  - 반환: 해당 월과 겹치는 주들을 1..N 번호로 정렬
 */
export function getWeekRangesForMonth(monthKey: string): Array<{
  weekNo: number;
  start: string; // 'YYYY-MM-DD' (월요일)
  end: string;   // 'YYYY-MM-DD' (일요일)
}> {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0)); // last day of month
  // first Monday on/before first day
  const firstDow = (first.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const firstMonday = new Date(first);
  firstMonday.setUTCDate(first.getUTCDate() - firstDow);

  const ranges: Array<{ weekNo: number; start: string; end: string }> = [];
  let cursor = new Date(firstMonday);
  let weekNo = 1;

  while (true) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setUTCDate(start.getUTCDate() + 6);

    // stop when range passes month end AND start > month end
    if (start > last && end > last) break;

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    ranges.push({ weekNo, start: iso(start), end: iso(end) });

    cursor.setUTCDate(cursor.getUTCDate() + 7);
    weekNo += 1;
    // safety: at most 6 weeks intersect a month
    if (weekNo > 6) break;
  }
  return ranges;
}

/** ---------- Monthly budgets ---------- */
export async function setMonthlyCap(month: string, cap: number): Promise<BudgetMonthlyRow> {
  const user_id = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("budgets_monthly")
    .upsert({ user_id, month, cap }, { onConflict: "user_id,month" })
    .select("*")
    .single();
  if (error) throw error;
  return data as BudgetMonthlyRow;
}

export async function getMonthlyCap(month: string): Promise<BudgetMonthlyRow | null> {
  const user_id = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("budgets_monthly")
    .select("*")
    .eq("user_id", user_id)
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return (data as BudgetMonthlyRow) ?? null;
}

/** ---------- Weekly limits ---------- */
export async function setWeeklyLimit(month: string, week_no: number, limit_amount: number): Promise<BudgetWeeklyRow> {
  const user_id = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("budgets_weekly")
    .upsert({ user_id, month, week_no, limit_amount }, { onConflict: "user_id,month,week_no" })
    .select("*")
    .single();
  if (error) throw error;
  return data as BudgetWeeklyRow;
}

export async function getWeeklyLimits(month: string): Promise<BudgetWeeklyRow[]> {
  const user_id = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("budgets_weekly")
    .select("*")
    .eq("user_id", user_id)
    .eq("month", month)
    .order("week_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BudgetWeeklyRow[];
}

/** 균등 분배(기본값)로 주간 한도를 자동 생성/덮어쓰기 */
export async function upsertWeeklyLimitsEvenly(month: string): Promise<BudgetWeeklyRow[]> {
  const capRow = await getMonthlyCap(month);
  if (!capRow) throw new Error("먼저 월간 상한(cap)을 설정하세요.");
  const ranges = getWeekRangesForMonth(month);
  const per = Math.floor((capRow.cap / ranges.length) * 100) / 100; // 소수 2자리 내림
  const outs: BudgetWeeklyRow[] = [];
  for (const r of ranges) {
    const row = await setWeeklyLimit(month, r.weekNo, per);
    outs.push(row);
  }
  return outs;
}

/** ---------- Expenses (간단 CRUD & 조회) ---------- */
export async function addExpense(input: {
  amount: number;
  currency?: string;
  category?: string | null;
  memo?: string | null;
  spent_at?: string; // 'YYYY-MM-DD'
}): Promise<ExpenseRow> {
  const user_id = await getUserIdOrThrow();
  const payload = {
    user_id,
    amount: input.amount,
    currency: input.currency ?? "KRW",
    category: input.category ?? null,
    memo: input.memo ?? null,
    spent_at: input.spent_at ?? new Date().toISOString().slice(0, 10),
  };
  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExpenseRow;
}

export async function listMonthlyExpenses(month: string): Promise<ExpenseRow[]> {
  const user_id = await getUserIdOrThrow();
  // 간단히 month prefix로 필터
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user_id)
    .like("spent_at", `${month}%`)
    .order("spent_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExpenseRow[];
}

/** 합계(간단 합산; 데이터가 매우 많다면 RPC/서버 집계를 고려) */
function sumAmount(rows: Pick<ExpenseRow, "amount">[]): number {
  return rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
}

/** 월 합계 */
export async function getMonthSpent(month: string): Promise<number> {
  const rows = await listMonthlyExpenses(month);
  return sumAmount(rows);
}

/** 주 합계: 주 구간(start~end) 기준 */
export async function getWeekSpent(start: string, end: string): Promise<number> {
  const user_id = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, spent_at")
    .eq("user_id", user_id)
    .gte("spent_at", start)
    .lte("spent_at", end);
  if (error) throw error;
  return sumAmount((data ?? []) as ExpenseRow[]);
}

/** ---------- Summary builders ---------- */
export type WeekSummary = {
  weekNo: number;
  start: string;
  end: string;
  limit: number | null;      // 설정 안했으면 null
  spent: number;             // 해당 주 지출
  remaining: number | null;  // limit가 있으면 limit-spent
};

export type MonthSummary = {
  month: string;           // 'YYYY-MM'
  cap: number | null;      // 월 상한
  monthSpent: number;      // 월 지출 합계
  monthRemaining: number | null; // cap - monthSpent
  weeks: WeekSummary[];    // 주별 현황
};

/** 월/주 예산 & 지출 요약 한 번에 */
export async function getBudgetSummary(month: string): Promise<MonthSummary> {
  const [capRow, limits, monthSpent, ranges] = await Promise.all([
    getMonthlyCap(month),
    getWeeklyLimits(month),
    getMonthSpent(month),
    Promise.resolve(getWeekRangesForMonth(month)),
  ]);

  const weeks: WeekSummary[] = [];
  for (const r of ranges) {
    const spent = await getWeekSpent(r.start, r.end);
    const limitRow = limits.find(l => l.week_no === r.weekNo) ?? null;
    const limit = limitRow ? Number(limitRow.limit_amount) : null;
    weeks.push({
      weekNo: r.weekNo,
      start: r.start,
      end: r.end,
      limit,
      spent,
      remaining: limit != null ? Math.max(0, limit - spent) : null,
    });
  }

  const cap = capRow ? Number(capRow.cap) : null;
  return {
    month,
    cap,
    monthSpent,
    monthRemaining: cap != null ? Math.max(0, cap - monthSpent) : null,
    weeks,
  };
}

/** ---------- Convenience: 오늘 기준 요약 ---------- */
export async function getThisMonthSummary(): Promise<MonthSummary> {
  const mk = monthKeyOf(new Date());
  return getBudgetSummary(mk);
}

/** ---------- Optional: 챌린지와 연동용 간단 Helper ---------- */
/** 월간 80% 임계치 도달 여부 */
export async function isMonthOver80Percent(month: string): Promise<boolean> {
  const [capRow, spent] = await Promise.all([getMonthlyCap(month), getMonthSpent(month)]);
  if (!capRow) return false;
  return spent >= capRow.cap * 0.8;
}