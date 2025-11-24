document.addEventListener("DOMContentLoaded", async () => {
  const { cosmosAssignments = [] } = await chrome.storage.local.get(["cosmosAssignments"]);

  // Background Script로만 업로드
  chrome.runtime.sendMessage({
    type: 'UPLOAD_TASKS',
    payload: cosmosAssignments
  }, (response) => {
    if (response?.success) {
      alert(`동기화 완료 ✅\n${cosmosAssignments.length}개의 과제를 처리했습니다.`);
    } else {
      alert("동기화 실패 ❌: " + (response?.error || "Unknown"));
    }
  });
});
