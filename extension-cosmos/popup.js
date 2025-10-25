import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { cosmosAssignments = [] } = await chrome.storage.local.get(["cosmosAssignments"]);

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const pending = [];

  for (const item of cosmosAssignments) {
    if (!item.dueISO) continue;
    const due = new Date(item.dueISO);
    const remain = due.getTime() - now.getTime();

    if (item.kind === "assignment") {
      await createTaskFromItem(item);
    } else if (item.kind === "quiz") {
      if (remain > 0 && remain <= weekMs) {
        await createTaskFromItem(item);
      } else if (remain > weekMs) {
        // 7일 초과 → 보류 저장
        pending.push({
          kind: "quiz",
          course: item.course,
          title: item.title,
          url: item.url,
          dueISO: item.dueISO
        });
      }
    }
  }

  // 기존 보류 + 이번에 추가한 보류 합치고, 중복 제거
  const { pendingQuizzes = [] } = await chrome.storage.local.get(["pendingQuizzes"]);
  const merged = dedupeByKey([...pendingQuizzes, ...pending], q => `${q.title}|${q.dueISO}`);
  await chrome.storage.local.set({ pendingQuizzes: merged });

  alert("동기화 완료 ✅ (과제 전부 + 7일 이내 퀴즈만 Task로 추가)");
});

function dedupeByKey(arr, keyFn) {
  const seen = new Set();
  return arr.filter(x => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function createTaskFromItem(item) {
  const dueISO = item.dueISO ?? null;
  const title = `[${item.course}] ${item.title}`;

  // 중복 방지: 동일 title & dueDate 있으면 skip
  if (await existsTask(title, dueISO)) {
    console.log("skip dup:", title, dueISO);
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    failed: false,
    createdAt: new Date().toISOString(),
    dueDate: dueISO
  };

  const { error } = await supabase.from("tasks").insert(task);
  if (error) console.error("❌ Task 업로드 실패:", error);
  else console.log("✅ Task 생성:", task.title);
}

async function existsTask(title, dueISO) {
  const q = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("title", title);

  if (dueISO) q.eq("dueDate", dueISO);
  const { count, error } = await q;
  if (error) {
    console.warn("existsTask check error:", error);
    return false; // 에러시라도 중복으로 막지 않음
  }
  return (count ?? 0) > 0;
}
