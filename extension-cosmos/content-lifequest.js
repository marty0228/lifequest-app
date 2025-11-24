(function () {
  console.log('[LifeQuest] Content Script loaded on', window.location.origin);

  // chrome API 사용 가능 여부 체크
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('[LifeQuest] chrome.storage API not available');
    return;
  }

  // 페이지 로드 시 즉시 확인
  chrome.storage.local.get(['userId'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('[LifeQuest] Storage access error:', chrome.runtime.lastError);
      return;
    }
    if (result.userId) {
      console.log('[LifeQuest] userId already stored:', result.userId);
    } else {
      console.log('[LifeQuest] No userId yet, waiting for login...');
    }
  });

  window.addEventListener('message', (event) => {
    // Origin 확인
    if (event.origin !== window.location.origin) return;
    
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    
    console.log('[LifeQuest] Message received:', data);
    
    if (data.type === 'LIFEQUEST_USER_ID' && data.userId) {
      console.log('[LifeQuest] ✅ userId received:', data.userId);
      
      chrome.storage.local.set({ userId: data.userId }, () => {
        if (chrome.runtime.lastError) {
          console.error('[LifeQuest] Storage save error:', chrome.runtime.lastError);
          return;
        }
        console.log('[LifeQuest] ✅ userId saved to extension storage');
        
        // 저장 확인
        chrome.storage.local.get(['userId'], (result) => {
          if (chrome.runtime.lastError) {
            console.error('[LifeQuest] Verification error:', chrome.runtime.lastError);
            return;
          }
          console.log('[LifeQuest] ✅ Verification - stored userId:', result.userId);
        });
      });
    }
  });
})();
