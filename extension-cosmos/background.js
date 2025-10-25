import { supabase } from "./supabase.js";

// 확장 설치/시작 시 알람 설정
chrome.runtime.onInstalled.addListener(() => scheduleMidnightSweep());
chrome.runtime.onStartup.addListener(() => scheduleMidnightSweep());

function scheduleMidnightSweep() {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // 내일
    0, 5, 0, 0         // 00:05 (서버/클라이언트 시간차 완충)
  );
  chrome.alarms.create("midnightSweep", {
    when: next.getTime(),
    periodInMinutes: 24 * 60
  });
  console.log("[bg] alarm scheduled @", next.toString());
}

// 알람 핸들러
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "midnightSweep") return;
  try {
    await promotePendingQuizzes();
  } catch (e) {
    console.error("[bg] promote error:", e);
  }
});

// 수동 테스트용: DevTools 콘솔에서 호출 가능
globalThis.promotePendingQuizzes = promotePendingQuizzes;

async function promotePendingQuizzes() {
  const { pendingQuizzes = [] } = await chrome.storage.local.get(["pendingQuizzes"]);
  if (!pendingQuizzes.length) {
    console.log("[bg] no pending quizzes");
    return;
  }

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const keep = [];
  const promote = [];

  for (const q of pendingQuizzes) {
    if (!q.dueISO) continue;
    const remain = new Date(q.dueISO).getTime() - now.getTime();
    if (remain > 0 && remain <= weekMs) promote.push(q);
    else keep.push(q);
  }

  // 승격 실행
  for (const item of promote) {
    const title = `[${item.course}] ${item.title}`;
    if (await existsTask(title, item.dueISO)) {
      console.log("[bg] dup skip:", title);
      continue;
    }

    const task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      failed: false,
      createdAt: new Date().toISOString(),
      dueDate: item.dueISO
    };

    const { error } = await supabase.from("tasks").insert(task);
    if (error) console.error("[bg] insert fail:", error);
    else console.log("[bg] promoted:", task.title);
  }

  // 남길 목록으로 갱신
  await chrome.storage.local.set({ pendingQuizzes: keep });
  console.log(`[bg] sweep done. promoted=${promote.length}, keep=${keep.length}`);
}

async function existsTask(title, dueISO) {
  const q = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("title", title);

  if (dueISO) q.eq("dueDate", dueISO);
  const { count, error } = await q;
  if (error) {
    console.warn("[bg] exists check error:", error);
    return false;
  }
  return (count ?? 0) > 0;
}
