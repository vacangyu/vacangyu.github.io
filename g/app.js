(function () {
  const frame = document.getElementById("capture-frame");
  const app = document.getElementById("app");
  const base = "captures/";

  const pages = {
    home: "home.html",
    "benjamin-results": "benjamin-results.html",
    "walter-results": "walter-results.html",
    "wiki-benjamin": "wiki-benjamin.html",
    "wiki-walter": "wiki-walter.html"
  };

  const state = {
    mode: "frame",
    frameKey: "home",
    query: "",
    kind: "",
    panelOrigin: "home",
    composing: false,
    compositionBase: "",
    compositionStart: 0,
    compositionEnd: 0
  };

  const data = {
    histories: ["기존 검색어 5", "기존 검색어 4", "기존 검색어 3", "기존 검색어 2", "기존 검색어 1"],
    performed: [],
    autocomplete: { benjamin: [], walter: [] }
  };

  const panel = document.createElement("section");
  panel.className = "search-panel";
  panel.setAttribute("aria-label", "검색어 입력");
  panel.hidden = true;
  app.appendChild(panel);

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = String(item || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  async function loadData() {
    try {
      const [historyRes, autoRes] = await Promise.all([
        fetch("search-history.md", { cache: "no-store" }),
        fetch("autocomplete.json", { cache: "no-store" })
      ]);
      if (historyRes.ok) {
        data.histories = (await historyRes.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      }
      if (autoRes.ok) data.autocomplete = await autoRes.json();
    } catch (error) {}

    try {
      data.performed = JSON.parse(sessionStorage.getItem("google-prop-history") || "[]");
    } catch (error) {
      data.performed = [];
    }
  }

  function savePerformed() {
    sessionStorage.setItem("google-prop-history", JSON.stringify(data.performed.slice(0, 6)));
  }

  function clearPerformed() {
    data.performed = [];
    sessionStorage.removeItem("google-prop-history");
  }

  function pushSnapshot() {
    history.pushState({ ...state }, "", location.pathname);
  }

  function replaceSnapshot() {
    history.replaceState({ ...state }, "", location.pathname);
  }

  function frameFile(key) {
    return pages[key] || pages.home;
  }

  function showFrame(key, options = {}) {
    state.mode = "frame";
    state.frameKey = key;
    state.query = options.query ?? state.query;
    state.kind = options.kind ?? state.kind;
    state.panelOrigin = options.panelOrigin ?? state.panelOrigin;
    panel.hidden = true;
    frame.hidden = false;
    frame.src = base + frameFile(key);
    if (!options.skipPush) pushSnapshot();
  }

  function normalizeForSuggest(query) {
    const value = String(query || "").trim();
    if (value.includes("밡")) return "발";
    return value;
  }

  // 한글 음절 → 초성 한 글자. 자모(ㄱㅂ 등)는 그대로.
  function chosungOf(ch) {
    if (!ch) return "";
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const idx = code - 0xAC00;
      const choIdx = Math.floor(idx / 28 / 21);
      return ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"][choIdx] || "";
    }
    return ch;
  }

  // 한글 호환 자모(ㄱ~ㅎ)의 단일 글자인지
  function isStandaloneJamo(text) {
    if (!text || text.length !== 1) return false;
    const code = text.charCodeAt(0);
    return code >= 0x3131 && code <= 0x314E;
  }

  function startsWithBeop(item) {
    return chosungOf(String(item || "").trim().charAt(0)) === "ㅂ";
  }

  // history 항목 ↔ query 매칭
  //  - 단일 자모 query (예: "ㅂ") → 첫 글자 초성 동일
  //  - 그 외 → 일반 prefix 매칭 (예: "베", "벤자민")
  function historyMatchesQuery(item, query) {
    const q = String(query || "").trim();
    if (!q) return true;
    if (isStandaloneJamo(q)) return chosungOf(item.charAt(0)) === q;
    return item.startsWith(q);
  }

  // 빈 입력 시 표시 정렬:
  //   1) performed (촬영 중 검색한 '벤자민 버튼'/'발터 벤야민') — 최신순 그대로 맨 위
  //   2) histories(.md) 중 ㅂ 시작 아닌 것
  //   3) histories(.md) 중 ㅂ 시작
  // 이미 performed 안의 항목이 histories에도 있으면 중복 제거.
  function arrangedHistory() {
    const performed = unique(data.performed);
    const performedSet = new Set(performed);
    const baseHistory = unique(data.histories).filter((h) => !performedSet.has(h));
    const nonB = baseHistory.filter((h) => !startsWithBeop(h));
    const yesB = baseHistory.filter((h) => startsWithBeop(h));
    return [...performed, ...nonB, ...yesB];
  }

  function kindForQuery(query) {
    const value = normalizeForSuggest(query);
    // ㅂ 단일 자모는 walter 분기로 보내 walter의 'ㅂ' 단계 자동완성을 사용
    if (value === "ㅂ") return "walter";
    if (value.includes("발터") || value.includes("벤야민") || value.startsWith("발") || value.startsWith("바")) return "walter";
    if (value.includes("벤자민") || value.startsWith("벤") || value.startsWith("베")) return "benjamin";
    return state.kind || "benjamin";
  }

  function resultKeyFor(query) {
    return kindForQuery(query) === "walter" ? "walter-results" : "benjamin-results";
  }

  function canonicalQuery(query) {
    return kindForQuery(query) === "walter" ? "발터 벤야민" : "벤자민 버튼";
  }

  function stageFor(query) {
    const normalized = normalizeForSuggest(query);
    const kind = kindForQuery(normalized);
    const stages = (data.autocomplete[kind] || []).slice();
    const exact = stages.find((item) => normalized === item.input);
    const committed = stages
      .filter((item) => item.input && normalized.startsWith(item.input))
      .sort((a, b) => b.input.length - a.input.length)[0];
    const next = stages
      .filter((item) => item.input && item.input.startsWith(normalized))
      .sort((a, b) => a.input.length - b.input.length)[0];
    const stage = exact || committed || next;
    return { kind, stage: stage || stages[stages.length - 1] || { input: normalized, suggestions: [] } };
  }

  function suggestionsFor(query) {
    const value = String(query || "").trim();

    if (!value) {
      // 빈 입력: performed 최상단 → ㅂ 아닌 .md → ㅂ 시작 .md
      return arrangedHistory().map((label) => ({ label, type: "history" }));
    }

    // 입력 진행 중: 매칭되는 history만 위에 + 그 아래 자동완성
    // (performed도 기록이므로 매칭 대상에 포함)
    const allHistory = unique([...data.performed, ...data.histories]);
    const matchedHistory = allHistory.filter((h) => historyMatchesQuery(h, value));
    const historyRows = matchedHistory.map((label) => ({ label, type: "history" }));

    const { stage } = stageFor(value);
    const suggestRows = unique(stage.suggestions || []).map((label) => ({ label, type: "suggestion" }));

    return [...historyRows, ...suggestRows];
  }

  function suggestionRows(query) {
    return suggestionsFor(query).map((item) => `
      <button type="button" class="suggestion-row ${item.type}" data-suggestion="${escapeHtml(item.label)}" data-type="${item.type}">
        <span class="suggestion-icon" aria-hidden="true">${iconSvg(item.type === "history" ? "history" : "search")}</span>
        <span class="suggestion-label">${escapeHtml(item.label)}</span>
        <span class="suggestion-fill" aria-hidden="true">${iconSvg(item.type === "history" ? "close" : "arrow-up-left")}</span>
      </button>
    `).join("");
  }

  function iconSvg(name) {
    const icons = {
      "arrow-back": '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4 4 12l8 8 1.4-1.4L7.8 13H20z"/></svg>',
      "arrow-up-left": '<svg viewBox="0 0 24 24"><path d="M6 6h12v12h-2V9.4l-9.3 9.3-1.4-1.4L14.6 8H6z"/></svg>',
      close: '<svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>',
      history: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-1 3h2v5.1l4.1 2.5-1 1.7-5.1-3.1z"/></svg>',
      search: '<svg viewBox="0 0 24 24"><path d="M9.5 4a5.5 5.5 0 0 1 4.4 8.8l5.1 5.1-1.4 1.4-5.1-5.1A5.5 5.5 0 1 1 9.5 4m0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7"/></svg>',
      mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3m5.3-3a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9z"/></svg>',
      lens: '<svg viewBox="0 0 24 24"><path d="M5 5h3l1.4-2h5.2L16 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2m7 3.5A4.5 4.5 0 1 0 12 17a4.5 4.5 0 0 0 0-9m0 2A2.5 2.5 0 1 1 12 15a2.5 2.5 0 0 1 0-5"/></svg>'
    };
    return icons[name] || "";
  }

  function showPanel(query, options = {}) {
    state.mode = "panel";
    state.query = query ?? "";
    state.kind = options.kind ?? kindForQuery(state.query);
    state.panelOrigin = options.origin || state.panelOrigin || "home";
    frame.hidden = true;
    panel.hidden = false;
    renderPanel();
    if (!options.skipPush) pushSnapshot();
  }

  function renderPanel() {
    const hasQuery = !!String(state.query || "").trim();
    panel.innerHTML = `
      <div class="search-panel-top">
        <button type="button" class="search-back" data-panel-back aria-label="뒤로">${iconSvg("arrow-back")}</button>
        <input class="panel-input" data-panel-input aria-label="Google 검색" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="ko" inputmode="search" enterkeyhint="search" value="${escapeHtml(state.query)}">
        <div class="panel-actions ${hasQuery ? "has-query" : ""}">
          <button type="button" class="panel-action search-mic" aria-label="음성 검색">${iconSvg("mic")}</button>
          <button type="button" class="panel-action search-lens" aria-label="이미지 검색">${iconSvg("lens")}</button>
          <button type="button" class="panel-action search-clear" data-panel-clear aria-label="검색어 지우기">${iconSvg("close")}</button>
        </div>
      </div>
      <div class="suggestion-list">${suggestionRows(state.query)}</div>
    `;

    requestAnimationFrame(() => {
      const input = panel.querySelector("[data-panel-input]");
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function rerenderSuggestions() {
    const actions = panel.querySelector(".panel-actions");
    if (actions) actions.classList.toggle("has-query", !!String(state.query || "").trim());
    const list = panel.querySelector(".suggestion-list");
    if (list) list.innerHTML = suggestionRows(state.query);
  }

  function readCompositionValue(input, event) {
    const current = input.value || "";
    const dataValue = event && typeof event.data === "string" ? event.data : "";
    if (!state.composing || !dataValue || current !== state.compositionBase) return current;
    const start = Math.max(0, Math.min(state.compositionStart, state.compositionBase.length));
    const end = Math.max(start, Math.min(state.compositionEnd, state.compositionBase.length));
    return state.compositionBase.slice(0, start) + dataValue + state.compositionBase.slice(end);
  }

  function updateQueryFromInput(input, event) {
    state.query = readCompositionValue(input, event);
    state.kind = kindForQuery(state.query);
    rerenderSuggestions();
  }

  function reset() {
    state.query = "";
    state.kind = "";
    state.panelOrigin = "home";
    clearPerformed();
    showFrame("home");
  }

  function performSearch(rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) return;
    const canonical = canonicalQuery(query);
    state.query = canonical;
    state.kind = kindForQuery(query);
    data.performed = unique([canonical, ...data.performed]).slice(0, 6);
    savePerformed();
    showFrame(resultKeyFor(query), { query: canonical, kind: state.kind, panelOrigin: "results" });
  }

  function openWiki() {
    const kind = state.kind || kindForQuery(state.query);
    showFrame(kind === "walter" ? "wiki-walter" : "wiki-benjamin", { kind, panelOrigin: "results" });
  }

  function isGoogleResetTarget(target, win) {
    const clickable = target.closest("a, button");
    if (!clickable) return false;
    const label = (clickable.getAttribute("aria-label") || clickable.textContent || "").trim();
    const href = clickable.getAttribute("href") || "";
    return label === "Google" || label === "로그인" || href === "/" || href.includes("google.com/?");
  }

  function isSearchBoxTarget(target) {
    return !!target.closest('textarea[name="q"], input[name="q"], textarea[aria-label="Google 검색"], input[aria-label="Google 검색"], .SDkEP, .a4bIc, [role="combobox"]');
  }

  function currentCaptureInput(doc) {
    const input = doc.querySelector('textarea[name="q"], input[name="q"], textarea[aria-label="Google 검색"], input[aria-label="Google 검색"]');
    const typed = (input?.value || input?.textContent || "").trim();
    if (typed) return typed;
    const title = doc.title || "";
    if (title.includes("발터 벤야민")) return "발터 벤야민";
    if (title.includes("벤자민 버튼")) return "벤자민 버튼";
    return (state.query || "").trim();
  }

  function attachCaptureHandlers() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;

    doc.addEventListener("submit", (event) => {
      event.preventDefault();
      performSearch(currentCaptureInput(doc));
    }, true);

    doc.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof win.Element)) return;

      if (isGoogleResetTarget(target, win)) {
        event.preventDefault();
        event.stopPropagation();
        reset();
        return;
      }

      if (isSearchBoxTarget(target)) {
        event.preventDefault();
        event.stopPropagation();
        const query = currentCaptureInput(doc);
        const origin = query ? "results" : "home";
        showPanel(query, { origin, kind: kindForQuery(query) });
        return;
      }

      const link = target.closest("a");
      const href = link ? (link.getAttribute("href") || "") : "";
      const text = (target.closest("a, div, span")?.textContent || "").replace(/\s+/g, " ").trim();
      if (href.includes("namu.wiki") || text.includes("나무위키")) {
        event.preventDefault();
        event.stopPropagation();
        openWiki();
        return;
      }

      if (link || target.closest("button")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  panel.addEventListener("input", (event) => {
    if (!event.target.matches("[data-panel-input]")) return;
    state.query = event.target.value;
    state.kind = kindForQuery(state.query);
    if (!state.composing) rerenderSuggestions();
  });

  panel.addEventListener("compositionstart", (event) => {
    if (!event.target.matches("[data-panel-input]")) return;
    state.composing = true;
    state.compositionBase = event.target.value || "";
    state.compositionStart = event.target.selectionStart ?? state.compositionBase.length;
    state.compositionEnd = event.target.selectionEnd ?? state.compositionStart;
  });

  panel.addEventListener("compositionupdate", (event) => {
    if (!event.target.matches("[data-panel-input]")) return;
    updateQueryFromInput(event.target, event);
  });

  panel.addEventListener("compositionend", (event) => {
    if (!event.target.matches("[data-panel-input]")) return;
    const composed = readCompositionValue(event.target, event);
    state.composing = false;
    state.query = event.target.value || composed;
    state.kind = kindForQuery(state.query);
    rerenderSuggestions();
  });

  panel.addEventListener("keydown", (event) => {
    if (!event.target.matches("[data-panel-input]")) return;
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      performSearch(event.target.value);
    }
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-panel-back]")) {
      event.preventDefault();
      if (state.panelOrigin === "results") showFrame(resultKeyFor(state.query), { query: canonicalQuery(state.query), kind: state.kind });
      else showFrame("home", { query: "", kind: "" });
      return;
    }

    if (event.target.closest("[data-panel-clear]")) {
      event.preventDefault();
      state.query = "";
      state.kind = "";
      renderPanel();
      return;
    }

    const row = event.target.closest("[data-suggestion]");
    if (!row) return;
    event.preventDefault();
    state.query = row.dataset.suggestion || "";
    state.kind = kindForQuery(state.query);
    renderPanel();
  });

  window.addEventListener("popstate", (event) => {
    const snapshot = event.state || { mode: "frame", frameKey: "home", query: "", kind: "", panelOrigin: "home" };
    Object.assign(state, snapshot);
    if (state.mode === "panel") {
      frame.hidden = true;
      panel.hidden = false;
      renderPanel();
    } else {
      panel.hidden = true;
      frame.hidden = false;
      frame.src = base + frameFile(state.frameKey);
    }
  });

  frame.addEventListener("load", attachCaptureHandlers);

  loadData().then(() => {
    frame.src = base + pages.home;
    replaceSnapshot();
  });
})();
