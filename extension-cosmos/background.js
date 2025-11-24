import { supabase } from "./supabase.js";

console.log('[bg] Background Script loaded');

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPLOAD_TASKS') {
    handleUploadTasks(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('[bg] upload failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

async function handleUploadTasks(items) {
  console.log('[bg] handleUploadTasks called with items:', items);
  
  if (!items || !items.length) {
    console.log('[bg] no items to upload');
    return;
  }

  for (const it of items) {
    // 과제만 업로드 (퀴즈 제외)
    if (it.kind !== 'assignment') {
      console.log('[bg] skip quiz:', it.title);
      continue;
    }

    const title = `[${it.course || ""}] ${it.title}`.trim();

    // 중복 체크
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("title", title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[bg] skip duplicate:', title);
      continue;
    }

    // Task 추가
    const task = {
      title,
      done: false,
      due_date: it.dueDate,  // YYYY-MM-DD
    };

    console.log('[bg] inserting task:', task);

    const { data, error } = await supabase.from("tasks").insert(task).select();
    
    if (error) {
      console.error('[bg] task insert failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        task: task
      });
    } else {
      console.log('[bg] ✅ task inserted:', data);
    }

    await sleep(100);
  }

  console.log('[bg] ✅ All tasks processed');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
