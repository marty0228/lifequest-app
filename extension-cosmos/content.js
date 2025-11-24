// content.js — Sejong eCampus 스크래퍼 (assign + quiz 전용 + Supabase 업로드)
(function () {
  /** =========================
   * 공통 유틸
   * ========================= */
  function waitFor(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const hit = document.querySelector(selector);
      if (hit) return resolve(hit);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error("timeout: " + selector)); }, timeout);
    });
  }

  // "2025-10-14 23:59" / "2025.10.14 23:59" / "2025년10월14일 23:59" / "… ~ 2025-10-19 23:59" → ISO
  function parseDue(text) {
    if (!text) return null;
    const cleaned = text
      .replace(/[년.\-\/]/g, "-")
      .replace(/[월]/g, "-")
      .replace(/[일]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 범위("시작 ~ 종료")가 있으면 종료쪽(마지막 날짜)을 사용
    const all = [...cleaned.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/g)];
    const m = all.length ? all[all.length - 1] : null;
    if (!m) return null;

    const [, y, mo, d, hh = "23", mm = "59"] = m;
    const dt = new Date(+y, +mo - 1, +d, +hh, +mm, 0);
    return {
      dueDate: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dueISO: dt.toISOString()
    };
  }

  function findRowValueByKeywords(table, keys) {
    if (!table) return "";
    for (const tr of table.querySelectorAll("tr")) {
      const label = (tr.querySelector("th, td.c0, td.label")?.textContent || "").trim();
      if (keys.some(k => label.includes(k))) {
        return (tr.querySelector("td:last-child, th:last-child")?.textContent || "").trim();
      }
    }
    return "";
  }

  function pickCourseFromDoc(doc) {
    return (doc.querySelector(".breadcrumb a[href*='/course/view.php']")?.textContent || "").trim();
  }

  function detailFromDoc(doc, kind) {
    const table = doc.querySelector("table.generaltable") || doc.querySelector("table");
    // 마감 텍스트 추출
    const dueTextPrimary = kind === "assignment"
      ? findRowValueByKeywords(table, ["종료 일시", "마감", "Due", "마감일"])
      : findRowValueByKeywords(table, ["응시기간", "종료 일시", "마감", "Close", "close"]);
    // 페이지 전체에서 보이는 날짜 범위를 백업으로 탐지
    const bodyText = (doc.body?.innerText || "").replace(/\s+/g, " ");
    const dueTextFallback =
      (bodyText.match(/(\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}(\s+\d{1,2}:\d{2})?)(\s*[~\-]\s*(\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}(\s+\d{1,2}:\d{2})?))?/) || [])[0] || "";

    const dueParsed = parseDue(dueTextPrimary || dueTextFallback);

    // 상태 텍스트 추출
    const statusText = kind === "assignment"
      ? (findRowValueByKeywords(table, ["제출", "제출 상태", "채점 상태", "Status"]) || "")
      : (findRowValueByKeywords(table, ["상태", "응시", "Attempt", "Attempts"]) || "");

    return {
      dueDate: dueParsed?.dueDate ?? null,
      dueISO: dueParsed?.dueISO ?? null,
      statusText
    };
  }

  async function fetchDetail(url, kind) {
    const res = await fetch(url, { credentials: "include" });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const course = pickCourseFromDoc(doc);
    const { dueDate, dueISO, statusText } = detailFromDoc(doc, kind);
    const title = (doc.querySelector("h2, .page-header .page-title")?.textContent || doc.title || "").trim();
    return { course, title, dueDate, dueISO, statusText };
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /** =========================
   * Background로 데이터 전송 (import 절대 사용 금지!)
   * ========================= */
  function sendToBackground(items) {
    try {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_TASKS',
        payload: items
      });
      console.log('[ecampus] sent', items.length, 'items to background');
    } catch (e) {
      console.warn('[ecampus] send failed:', e);
    }
  }

  /** =========================
   * 메인 스크래핑
   * ========================= */
  async function scrape() {
    const url = location.href;
    const items = [];

    /** 1) 대시보드: 모든 강좌 → (과제/퀴즈) 링크 수집 → 상세 fetch */
    if (/\/dashboard\.php$|\/my\/?$/.test(url)) {
      console.log("[ecampus] collecting from dashboard…");
      await waitFor("#page, #region-main, .course_list, .courses");

      const courseLinks = [
        ...new Set([...document.querySelectorAll("a[href*='/course/view.php?id=']")].map(a => a.href))
      ].map(href => {
        const a = document.querySelector(`a[href*='${href}']`);
        return { title: (a?.textContent || "").trim(), url: href };
      });

      for (const course of courseLinks) {
        try {
          const res = await fetch(course.url, { credentials: "include" });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");

          // 과제 + 퀴즈 링크만
          const assignLinks = [...doc.querySelectorAll("a[href*='/mod/assign/view.php?id=']")].map(a => ({
            kind: "assignment", title: (a.textContent || "").trim(), url: a.href
          }));
          const quizLinks = [...doc.querySelectorAll("a[href*='/mod/quiz/view.php?id=']")].map(a => ({
            kind: "quiz", title: (a.textContent || "").trim(), url: a.href
          }));
          const links = [...assignLinks, ...quizLinks];

          for (const ln of links) {
            try {
              const detail = await fetchDetail(ln.url, ln.kind);
              items.push({
                kind: ln.kind,
                course: detail.course || course.title,
                title: ln.title || detail.title,
                url: ln.url,
                dueDate: detail.dueDate,
                dueISO: detail.dueISO,
                statusText: detail.statusText
              });
              await sleep(250);
            } catch (e) {
              console.warn("[ecampus] detail failed:", ln.url, e);
            }
          }

          await sleep(200);
        } catch (e) {
          console.warn("[ecampus] course failed:", course.url, e);
        }
      }

      // ✅ 스크랩 후 Background로 전송
      if (items.length > 0) {
        // ✅ chrome API 안전 체크 추가
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ cosmosAssignments: items, cosmosCapturedAt: Date.now() });
        }
        console.log('[ecampus] scraped:', items, 'from /dashboard.php');
        sendToBackground(items);
      }
      
      return items;
    }

    /** 2) 강좌 페이지: 현재 강좌의 과제/퀴즈 링크 수집 → 상세 fetch */
    if (/\/course\/view\.php\?id=\d+/.test(url)) {
      await waitFor("#region-main, #page-content, .course-content");
      const courseTitle =
        (document.querySelector("#page-header .page-title, .page-header-headings h1, .coursename")?.textContent || "")
          .trim();

      const assignLinks = [...document.querySelectorAll("a[href*='/mod/assign/view.php?id=']")].map(a => ({
        kind: "assignment", title: (a.textContent || "").trim(), url: a.href
      }));
      const quizLinks = [...document.querySelectorAll("a[href*='/mod/quiz/view.php?id=']")].map(a => ({
        kind: "quiz", title: (a.textContent || "").trim(), url: a.href
      }));
      const links = [...assignLinks, ...quizLinks];

      for (const ln of links) {
        try {
          const detail = await fetchDetail(ln.url, ln.kind);
          items.push({
            kind: ln.kind,
            course: detail.course || courseTitle,
            title: ln.title || detail.title,
            url: ln.url,
            dueDate: detail.dueDate,
            dueISO: detail.dueISO,
            statusText: detail.statusText
          });
          await sleep(200);
        } catch (e) {
          console.warn("[ecampus] detail failed:", ln.url, e);
        }
      }

      // ✅ 스크랩 후 Background로 전송
      if (items.length > 0) {
        // ✅ chrome API 안전 체크 추가
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ cosmosAssignments: items, cosmosCapturedAt: Date.now() });
        }
        console.log('[ecampus] scraped:', items, 'from /course/view.php');
        sendToBackground(items);
      }
      
      return items;
    }

    /** 3) 과제 상세: 현재 페이지에서 직접 파싱 */
    if (/\/mod\/assign\/view\.php\?id=\d+/.test(url)) {
      await waitFor("h2, .page-header, table, .generaltable");
      const course = pickCourseFromDoc(document);
      const title =
        (document.querySelector("h2, .page-header .page-title")?.textContent || document.title || "").trim();
      const { dueDate, dueISO, statusText } = detailFromDoc(document, "assignment");

      const row = { kind: "assignment", course, title, url, dueDate, dueISO, statusText };
      // ✅ chrome API 안전 체크 추가
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ cosmosAssignments: [row], cosmosCapturedAt: Date.now() });
      }
      console.log("[ecampus] scraped:", [row]);
      sendToBackground([row]);
      return [row];
    }

    /** 4) 퀴즈 상세: 현재 페이지에서 직접 파싱 */
    if (/\/mod\/quiz\/view\.php\?id=\d+/.test(url)) {
      await waitFor("h2, .page-header, table, .generaltable");
      const course = pickCourseFromDoc(document);
      const title =
        (document.querySelector("h2, .page-header .page-title")?.textContent || document.title || "").trim();
      const { dueDate, dueISO, statusText } = detailFromDoc(document, "quiz");

      const row = { kind: "quiz", course, title, url, dueDate, dueISO, statusText };
      // ✅ chrome API 안전 체크 추가
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ cosmosAssignments: [row], cosmosCapturedAt: Date.now() });
      }
      console.log("[ecampus] scraped:", [row]);
      sendToBackground([row]);
      return [row];
    }

    // 기타 페이지
    // ✅ chrome API 안전 체크 추가
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ cosmosAssignments: [], cosmosCapturedAt: Date.now() });
    }
    console.log("[ecampus] no data for:", location.pathname);
    return [];
  }

  // popup에서 수동 실행 가능
  window.cosmosScrapeAssignments = scrape;

  // 페이지 진입 시 1회 자동 실행
  scrape().catch(err => console.warn("[ecampus] scrape error:", err));
})();