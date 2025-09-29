// src/utils/time.ts
export function endOfDayLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}
export function msUntilNextMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0); // 내일 00:00
  return next.getTime() - now.getTime();
}
export function dueRemainLabel(dueDate: string, now = new Date()):
  { text: string; urgent: boolean; overdue: boolean } {
  const target = endOfDayLocal(dueDate);
  const diffMs = target.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (diffMs >= 24 * 3600 * 1000) return { text: `${days}일 남음`, urgent: false, overdue: false };
  if (diffMs >= 0) {
    if (hours >= 1) return { text: `${hours}시간 ${mins % 60}분 남음`, urgent: true, overdue: false };
    return { text: `${mins}분 남음`, urgent: true, overdue: false };
  }
  if (hours >= 1) return { text: `${hours}시간 ${mins % 60}분 전`, urgent: true, overdue: true };
  return { text: `${mins}분 전`, urgent: true, overdue: true };
}
