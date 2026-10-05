(() => {
  "use strict";

  const STORAGE_KEY = "focus-log-pwa-v1";
  const state = loadState();
  let selectedDate = todayKey();
  let timerInterval = null;
  let toastTimer = null;

  const elements = {
    timer: document.querySelector("#timer"),
    timerCard: document.querySelector(".timer-card"),
    statusBadge: document.querySelector("#statusBadge"),
    memoInput: document.querySelector("#memoInput"),
    idleActions: document.querySelector("#idleActions"),
    runningActions: document.querySelector("#runningActions"),
    startButton: document.querySelector("#startButton"),
    breakButton: document.querySelector("#breakButton"),
    endButton: document.querySelector("#endButton"),
    helperText: document.querySelector("#helperText"),
    previousDay: document.querySelector("#previousDay"),
    nextDay: document.querySelector("#nextDay"),
    datePicker: document.querySelector("#datePicker"),
    selectedDateLabel: document.querySelector("#selectedDateLabel"),
    todayButton: document.querySelector("#todayButton"),
    totalTime: document.querySelector("#totalTime"),
    averageTime: document.querySelector("#averageTime"),
    longestTime: document.querySelector("#longestTime"),
    breakCount: document.querySelector("#breakCount"),
    sessionCount: document.querySelector("#sessionCount"),
    sessionList: document.querySelector("#sessionList"),
    emptyState: document.querySelector("#emptyState"),
    toast: document.querySelector("#toast")
  };

  function emptyState() {
    return { version: 1, days: {}, activeSession: null };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return emptyState();
      return {
        version: 1,
        days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
        activeSession: parsed.activeSession && parsed.activeSession.startedAt
          ? parsed.activeSession
          : null
      };
    } catch (error) {
      console.warn("저장된 기록을 읽지 못했습니다.", error);
      return emptyState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("저장 공간이 부족해 기록을 저장하지 못했어요.");
      console.error(error);
    }
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(value = new Date()) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function parseLocalDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function moveDate(key, amount) {
    const date = parseLocalDate(key);
    date.setDate(date.getDate() + amount);
    return dateKey(date);
  }

  function makeId() {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getDay(key) {
    if (!state.days[key]) state.days[key] = { sessions: [] };
    if (!Array.isArray(state.days[key].sessions)) state.days[key].sessions = [];
    return state.days[key];
  }

  function startSession(options = {}) {
    if (state.activeSession) return;
    const now = new Date();
    state.activeSession = {
      id: makeId(),
      startedAt: now.toISOString(),
      memo: (options.memo ?? elements.memoInput.value).trim().slice(0, 80)
    };
    selectedDate = todayKey();
    saveState();
    startTicker();
    render();
    showToast("집중을 시작했어요.");
  }

  function finishSession(reason, shouldRestart = false) {
    const active = state.activeSession;
    if (!active) return;

    const endedAt = new Date();
    const startedAt = new Date(active.startedAt);
    const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
    const session = {
      id: active.id,
      startedAt: active.startedAt,
      endedAt: endedAt.toISOString(),
      durationMs,
      memo: active.memo || "",
      reason
    };

    getDay(dateKey(startedAt)).sessions.push(session);
    state.activeSession = null;

    if (shouldRestart) {
      state.activeSession = {
        id: makeId(),
        startedAt: endedAt.toISOString(),
        memo: session.memo
      };
      elements.memoInput.value = session.memo;
    } else {
      elements.memoInput.value = "";
    }

    selectedDate = todayKey();
    saveState();
    render();
    if (shouldRestart) {
      startTicker();
      showToast("깨짐을 기록하고 바로 다시 시작했어요.");
    } else {
      stopTicker();
      showToast("집중 세션을 저장했어요.");
    }
  }

  function currentElapsedMs() {
    if (!state.activeSession) return 0;
    return Math.max(0, Date.now() - new Date(state.activeSession.startedAt).getTime());
  }

  function formatTimer(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    if (totalSeconds < 60) return `${totalSeconds}초`;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes}분`;
    return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }

  function formatClock(iso) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(iso));
  }

  function formatDateLabel(key) {
    if (key === todayKey()) return "오늘";
    if (key === moveDate(todayKey(), -1)) return "어제";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(parseLocalDate(key));
  }

  function startTicker() {
    stopTicker();
    updateTimer();
    timerInterval = window.setInterval(() => {
      updateTimer();
      if (selectedDate === todayKey()) renderStats();
    }, 1000);
  }

  function stopTicker() {
    if (timerInterval) window.clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTimer() {
    elements.timer.textContent = formatTimer(currentElapsedMs());
    document.title = state.activeSession
      ? `${formatTimer(currentElapsedMs())} · 집중 중`
      : "집중기록";
  }

  function sessionsForSelectedDay() {
    return getDay(selectedDate).sessions.slice().sort((a, b) =>
      new Date(a.startedAt) - new Date(b.startedAt)
    );
  }

  function activeDurationForSelectedDay() {
    if (!state.activeSession) return 0;
    return dateKey(new Date(state.activeSession.startedAt)) === selectedDate
      ? currentElapsedMs()
      : 0;
  }

  function renderStats() {
    const sessions = sessionsForSelectedDay();
    const completedDurations = sessions.map((session) => Number(session.durationMs) || 0);
    const activeDuration = activeDurationForSelectedDay();
    const total = completedDurations.reduce((sum, value) => sum + value, 0) + activeDuration;
    const durationItems = activeDuration > 0 ? [...completedDurations, activeDuration] : completedDurations;
    const average = durationItems.length ? total / durationItems.length : 0;
    const longest = durationItems.length ? Math.max(...durationItems) : 0;
    const interruptions = sessions.filter((session) => session.reason === "interruption").length;

    elements.totalTime.textContent = formatDuration(total);
    elements.averageTime.textContent = formatDuration(average);
    elements.longestTime.textContent = formatDuration(longest);
    elements.breakCount.textContent = `${interruptions}회`;
  }

  function makeSessionItem(session, index) {
    const item = document.createElement("li");
    item.className = "session-item";

    const top = document.createElement("div");
    top.className = "session-top";

    const indexBadge = document.createElement("span");
    indexBadge.className = "session-index";
    indexBadge.textContent = String(index + 1);

    const duration = document.createElement("span");
    duration.className = "session-duration";
    duration.textContent = formatDuration(session.durationMs);
    top.append(indexBadge, duration);

    const memo = document.createElement("p");
    memo.className = `session-memo${session.memo ? "" : " is-empty"}`;
    memo.textContent = session.memo || "메모 없음";

    const meta = document.createElement("div");
    meta.className = "session-meta";
    const time = document.createElement("span");
    time.textContent = `${formatClock(session.startedAt)} – ${formatClock(session.endedAt)}`;
    const reason = document.createElement("span");
    reason.className = `reason-tag${session.reason === "interruption" ? " interruption" : ""}`;
    reason.textContent = session.reason === "interruption" ? "집중 깨짐" : "종료";
    meta.append(time, reason);

    item.append(top, memo, meta);
    return item;
  }

  function renderHistory() {
    const sessions = sessionsForSelectedDay();
    elements.sessionList.replaceChildren();
    sessions.forEach((session, index) => {
      elements.sessionList.append(makeSessionItem(session, index));
    });
    elements.emptyState.hidden = sessions.length > 0;
    elements.sessionCount.textContent = `${sessions.length}개`;
  }

  function renderDateNavigation() {
    elements.datePicker.value = selectedDate;
    elements.datePicker.max = todayKey();
    elements.selectedDateLabel.textContent = formatDateLabel(selectedDate);
    elements.nextDay.disabled = selectedDate >= todayKey();
    elements.todayButton.hidden = selectedDate === todayKey();
  }

  function render() {
    const running = Boolean(state.activeSession);
    elements.idleActions.hidden = running;
    elements.runningActions.hidden = !running;
    elements.timerCard.classList.toggle("is-running", running);
    elements.statusBadge.classList.toggle("running", running);
    elements.statusBadge.textContent = running ? "집중 중" : "준비";
    elements.helperText.textContent = running
      ? "집중이 흐트러진 순간 ‘집중 깨짐’을 눌러주세요."
      : "메모는 선택 사항이에요. 바로 시작해도 됩니다.";

    if (running && document.activeElement !== elements.memoInput) {
      elements.memoInput.value = state.activeSession.memo || "";
    }

    updateTimer();
    renderDateNavigation();
    renderStats();
    renderHistory();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }

  elements.startButton.addEventListener("click", () => startSession());
  elements.breakButton.addEventListener("click", () => finishSession("interruption", true));
  elements.endButton.addEventListener("click", () => finishSession("completed", false));

  elements.memoInput.addEventListener("input", () => {
    if (!state.activeSession) return;
    state.activeSession.memo = elements.memoInput.value.slice(0, 80);
    saveState();
  });

  elements.memoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") elements.memoInput.blur();
  });

  elements.previousDay.addEventListener("click", () => {
    selectedDate = moveDate(selectedDate, -1);
    render();
  });

  elements.nextDay.addEventListener("click", () => {
    if (selectedDate >= todayKey()) return;
    selectedDate = moveDate(selectedDate, 1);
    render();
  });

  elements.datePicker.addEventListener("change", () => {
    if (!elements.datePicker.value) return;
    selectedDate = elements.datePicker.value > todayKey()
      ? todayKey()
      : elements.datePicker.value;
    render();
  });

  elements.todayButton.addEventListener("click", () => {
    selectedDate = todayKey();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      render();
      if (state.activeSession) startTicker();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const latest = loadState();
    state.days = latest.days;
    state.activeSession = latest.activeSession;
    render();
    if (state.activeSession) startTicker();
    else stopTicker();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("오프라인 기능을 준비하지 못했습니다.", error);
      });
    });
  }

  render();
  if (state.activeSession) startTicker();
})();
