const STORAGE_KEY = "xinyu-mood-entries-v1";

const demoEntries = [
  { id: "demo-1", date: "2026-09-16", mood: "疲惫", score: 43, intensity: 4, triggers: ["工作负荷", "睡眠不足"], text: "项目临近交付，晚上还在反复确认细节。", demo: true },
  { id: "demo-2", date: "2026-09-17", mood: "平静", score: 64, intensity: 2, triggers: ["身体状态"], text: "下班后散步了二十分钟，脑子慢慢安静下来。", demo: true },
  { id: "demo-3", date: "2026-09-18", mood: "轻松", score: 76, intensity: 3, triggers: ["人际关系"], text: "和很久没见的朋友吃饭，聊了很多近况。", demo: true },
  { id: "demo-4", date: "2026-09-19", mood: "低落", score: 32, intensity: 4, triggers: ["工作负荷"], text: "会议上没有表达清楚自己的想法，有点懊恼。", demo: true },
  { id: "demo-5", date: "2026-09-20", mood: "疲惫", score: 46, intensity: 3, triggers: ["睡眠不足", "身体状态"], text: "昨晚睡得很晚，今天注意力总是飘走。", demo: true },
  { id: "demo-6", date: "2026-09-21", mood: "平静", score: 67, intensity: 3, triggers: ["说不清"], text: "给自己留了一段没有安排的时间。", demo: true }
];

const moodConfig = {
  "低落": { color: "#81799c", title: "这份低落不需要被立刻赶走，它或许在提醒你慢一点。" },
  "疲惫": { color: "#7a8986", title: "你可能不是“不够努力”，只是连续消耗太久了。" },
  "平静": { color: "#657c68", title: "此刻的平静值得被记住，它是你可以再次回到的地方。" },
  "轻松": { color: "#d49b68", title: "轻松不是偷懒，而是身心终于有了松动的空间。" },
  "开心": { color: "#d38055", title: "这份开心很珍贵，试着记住是什么让它发生。" }
};

const insightBodies = {
  "工作负荷": "你提到的情绪和工作节奏同时出现。即使任务暂时停下，注意力可能仍留在未完成的事情上。这是持续消耗后的自然反应，不代表你的能力出了问题。",
  "学业压力": "当目标、截止时间和自我期待叠在一起，情绪很容易被压缩。此刻先把下一步缩小，比要求自己一次解决全部更有帮助。",
  "人际关系": "关系中的不确定感会占用很多注意力。你不必立刻得出结论，可以先辨认：此刻更需要被理解、被回应，还是暂时留一点空间。",
  "睡眠不足": "睡眠会直接影响情绪的敏感度和恢复力。今天的感受可能被疲劳放大了，先恢复身体，再评价自己会更公平。",
  "身体状态": "身体的不适常常比语言更早发出信号。先照顾紧绷、疼痛或疲劳，也是在认真回应自己的情绪。",
  "说不清": "暂时说不清也完全可以。情绪不一定马上有答案，愿意停下来感受，本身就是一次有效的觉察。"
};

const riskWords = ["不想活", "自杀", "结束生命", "伤害自己", "活着没意思", "想死"];
let selectedMood = "平静";
let selectedScore = 62;
let breathingTimer = null;
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function localEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function allEntries() {
  return [...demoEntries, ...localEntries()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function formatDate(dateString, includeYear = false) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) }).format(date);
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchPage(page) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  $("#todayPage").classList.toggle("active", page === "today");
  $("#journeyPage").classList.toggle("active", page === "journey");
  if (page === "journey") renderJourney();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateInsight() {
  const triggers = $$("#triggerOptions button.selected").map((button) => button.dataset.trigger);
  const primaryTrigger = triggers[0] || "说不清";
  $("#insightTitle").textContent = moodConfig[selectedMood].title;
  $("#insightBody").textContent = insightBodies[primaryTrigger];
  $("#insightTags").innerHTML = (triggers.length ? triggers : ["继续观察"]).map((trigger) => `<span>${escapeHtml(trigger)}</span>`).join("");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function containsRisk(text) {
  return riskWords.some((word) => text.includes(word));
}

function saveEntry() {
  const text = $("#journalText").value.trim();
  const triggers = $$("#triggerOptions button.selected").map((button) => button.dataset.trigger);
  if (!text) {
    $("#journalText").focus();
    showToast("先写下一点此刻发生的事吧");
    return;
  }
  if (containsRisk(text)) {
    openSafetyModal();
    return;
  }

  const entries = localEntries();
  entries.push({
    id: `entry-${Date.now()}`,
    date: todayString(),
    mood: selectedMood,
    score: selectedScore,
    intensity: Number($("#intensity").value),
    triggers: triggers.length ? triggers : ["说不清"],
    text,
    demo: false
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  updateInsight();
  $("#insightTime").textContent = "刚刚生成";
  $("#insightCard").animate([
    { transform: "translateY(8px)", opacity: .55 },
    { transform: "translateY(0)", opacity: 1 }
  ], { duration: 420, easing: "ease-out" });
  $("#saveState").textContent = "已安全保存在当前设备";
  $("#streakNumber").textContent = Math.min(9, 4 + new Set(entries.map((entry) => entry.date)).size);
  showToast("记录已保存，感谢你认真听见自己");
  if (window.innerWidth < 900) $("#insightCard").scrollIntoView({ behavior: "smooth", block: "center" });
}

function moodColor(mood) {
  return (moodConfig[mood] || moodConfig["平静"]).color;
}

function renderJourney() {
  const entries = allEntries();
  const recent = entries.slice(-7);
  const average = recent.length ? Math.round(recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length) : 0;
  $("#averageScore").textContent = average;
  $("#weeklyCount").textContent = recent.length;

  const moodCounts = countValues(recent.map((entry) => entry.mood));
  const topMood = topPair(moodCounts, ["平静", 0]);
  $("#commonMood").textContent = topMood[0];
  $("#commonMoodMeta").textContent = `${topMood[1]} 次记录`;

  const triggerCounts = countValues(recent.flatMap((entry) => entry.triggers));
  const topTrigger = topPair(triggerCounts, ["暂无", 0]);
  $("#commonTrigger").textContent = topTrigger[0].replace("负荷", "");
  $("#commonTriggerMeta").textContent = recent.length ? `占本周记录 ${Math.round(topTrigger[1] / recent.length * 100)}%` : "等待记录";

  renderChart(recent);
  renderTriggerBars(triggerCounts, recent.length);
  renderHistory(entries.slice().reverse().slice(0, 8));
}

function countValues(values) {
  return values.reduce((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {});
}

function topPair(object, fallback) {
  return Object.entries(object).sort((a, b) => b[1] - a[1])[0] || fallback;
}

function renderChart(entries) {
  const container = $("#moodChart");
  if (!entries.length) { container.innerHTML = '<div class="empty-state">记录后，这里会出现你的情绪轨迹</div>'; return; }
  const width = 650, height = 230, left = 38, right = 18, top = 18, bottom = 38;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const points = entries.map((entry, index) => {
    const x = entries.length === 1 ? left + innerWidth / 2 : left + index * innerWidth / (entries.length - 1);
    const y = top + (100 - entry.score) / 100 * innerHeight;
    return { x, y, entry };
  });
  const path = points.map((p, index) => `${index ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${(top + innerHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(top + innerHeight).toFixed(1)} Z`;
  const grid = [25, 50, 75].map((value) => {
    const y = top + (100 - value) / 100 * innerHeight;
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e8e7e1" stroke-width="1" stroke-dasharray="3 5"/><text x="5" y="${y+4}" fill="#9a9d95" font-size="10">${value}</text>`;
  }).join("");
  const nodes = points.map((p) => `<g><circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="${moodColor(p.entry.mood)}" stroke-width="3"/><text x="${p.x}" y="${height-12}" text-anchor="middle" fill="#858981" font-size="10">${formatDate(p.entry.date).replace("月", "/").replace("日", "")}</text></g>`).join("");
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="七天情绪能量曲线"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#91a28e" stop-opacity=".28"/><stop offset="100%" stop-color="#91a28e" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${areaPath}" fill="url(#area)"/><path d="${path}" fill="none" stroke="#657c68" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${nodes}</svg>`;
}

function renderTriggerBars(counts, total) {
  const container = $("#triggerBars");
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 4);
  if (!sorted.length) { container.innerHTML = '<div class="empty-state">还没有足够的数据</div>'; return; }
  container.innerHTML = sorted.map(([name, count], index) => {
    const percent = Math.round(count / Math.max(total, 1) * 100);
    const colors = ["#657c68", "#81799c", "#d49b68", "#96a092"];
    return `<div><div class="trigger-bar-top"><span>${escapeHtml(name)}</span><span>${percent}%</span></div><div class="trigger-bar-track"><div class="trigger-bar-fill" style="width:${percent}%;background:${colors[index]}"></div></div></div>`;
  }).join("");
}

function renderHistory(entries) {
  const container = $("#historyList");
  if (!entries.length) { container.innerHTML = '<div class="empty-state">还没有记录，先从今天开始吧</div>'; return; }
  container.innerHTML = entries.map((entry) => `<article class="history-item"><span class="history-date">${formatDate(entry.date)}</span><span class="history-mood"><i style="background:${moodColor(entry.mood)}"></i>${escapeHtml(entry.mood)}</span><span class="history-text">${escapeHtml(entry.text)}</span><span>${entry.demo ? "演示记录" : "我的记录"}</span></article>`).join("");
}

function openModal(content) {
  $("#modalContent").innerHTML = content;
  $("#careModal").classList.add("open");
  $("#careModal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("#careModal").classList.remove("open");
  $("#careModal").setAttribute("aria-hidden", "true");
  clearInterval(breathingTimer);
}

function openBreathing() {
  openModal(`<div class="breathing-stage"><span class="step-label">一分钟呼吸空间</span><h2 id="modalTitle">跟着圆圈，慢慢呼吸</h2><p>圆圈变大时吸气，变小时呼气。无需做到标准，只需要比刚才慢一点。</p><div class="breathing-orb"><span id="breathGuide">慢慢吸气</span></div><div class="breathing-time">剩余 <strong id="breathSeconds">60</strong> 秒</div><div class="modal-actions"><button id="startBreathing">开始</button><button id="finishBreathing">先到这里</button></div></div>`);
  let seconds = 60, running = false;
  $("#startBreathing").addEventListener("click", () => {
    if (running) return;
    running = true;
    $("#startBreathing").textContent = "呼吸中";
    breathingTimer = setInterval(() => {
      seconds -= 1;
      $("#breathSeconds").textContent = seconds;
      $("#breathGuide").textContent = seconds % 10 > 5 ? "慢慢吸气" : "缓缓呼气";
      if (seconds <= 0) { clearInterval(breathingTimer); $("#breathGuide").textContent = "辛苦了"; $("#startBreathing").textContent = "已完成"; }
    }, 1000);
  });
  $("#finishBreathing").addEventListener("click", () => { closeModal(); showToast("你已经为自己留出了一点空间"); });
}

function openMusic() {
  openModal(`<div class="breathing-stage"><span class="step-label">舒缓环境音</span><h2 id="modalTitle">暂时让注意力离开任务</h2><p>这个雏形用动态节奏模拟声音播放状态。闭上眼睛，想象窗外很轻的雨声。</p><div class="sound-bars"><i></i><i></i><i></i><i></i><i></i></div><div class="modal-actions"><button id="finishSound">结束练习</button><button id="switchSound">切换为海浪</button></div></div>`);
  $("#finishSound").addEventListener("click", () => { closeModal(); showToast("欢迎带着一点松弛回来"); });
  $("#switchSound").addEventListener("click", (event) => { event.currentTarget.textContent = "正在想象海浪"; });
}

function openStretch() {
  openModal(`<div><span class="step-label">三步肩颈伸展</span><h2 id="modalTitle">把积累的紧绷放下一点</h2><p>动作保持轻柔。如果感到疼痛，请立即停止。</p><div class="stretch-steps"><div>1. 肩膀向上靠近耳朵，停留 3 秒，再缓缓放下</div><div>2. 头部轻轻向左、向右倾斜，各停留 5 秒</div><div>3. 双手向前伸展，慢慢呼出一口气</div></div><button class="primary-button small" id="finishStretch">完成伸展</button></div>`);
  $("#finishStretch").addEventListener("click", () => { closeModal(); showToast("做得很好，留意一下身体现在的感觉"); });
}

function openSafetyModal() {
  openModal(`<div class="safety-message"><span class="step-label">你的安全最重要</span><h2 id="modalTitle">现在请不要独自承受</h2><p>我注意到你写下了可能与人身安全有关的内容。这个工具不能替代即时帮助，但你值得马上得到真实的支持。</p><div class="support-box">请立刻联系一位你信任的人并告诉对方你现在的情况。如果存在立即危险，请联系当地紧急服务或前往最近的急诊机构，并尽量不要独处。</div><div class="modal-actions"><button id="ackSafety">我会联系他人</button><button id="closeSafety">先返回记录</button></div></div>`);
  $("#ackSafety").addEventListener("click", () => { closeModal(); showToast("请优先联系可信任的人并待在安全环境中"); });
  $("#closeSafety").addEventListener("click", closeModal);
}

function init() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchPage(button.dataset.page)));
  $("#backToRecord").addEventListener("click", () => switchPage("today"));

  $$(".mood-option").forEach((button) => button.addEventListener("click", () => {
    $$(".mood-option").forEach((item) => { item.classList.remove("selected"); item.setAttribute("aria-pressed", "false"); });
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedMood = button.dataset.mood;
    selectedScore = Number(button.dataset.score);
    updateInsight();
  }));

  $("#intensity").addEventListener("input", (event) => { $("#intensityValue").textContent = `${event.target.value} / 5`; });
  $("#journalText").addEventListener("input", (event) => { $("#charCount").textContent = `${event.target.value.length} / 300`; });
  $$("#triggerOptions button").forEach((button) => button.addEventListener("click", () => { button.classList.toggle("selected"); updateInsight(); }));
  $("#saveEntryButton").addEventListener("click", saveEntry);
  $$(".care-card").forEach((button) => button.addEventListener("click", () => ({ breath: openBreathing, music: openMusic, stretch: openStretch })[button.dataset.care]()));
  $("#closeCareModal").addEventListener("click", closeModal);
  $("#careModal").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });

  const privacyModal = $("#privacyModal");
  const closePrivacy = () => { privacyModal.classList.remove("open"); privacyModal.setAttribute("aria-hidden", "true"); };
  $("#privacyButton").addEventListener("click", () => { privacyModal.classList.add("open"); privacyModal.setAttribute("aria-hidden", "false"); });
  $("#closePrivacyModal").addEventListener("click", closePrivacy);
  $("#understandPrivacy").addEventListener("click", closePrivacy);
  privacyModal.addEventListener("click", (event) => { if (event.target === event.currentTarget) closePrivacy(); });

  $("#clearEntries").addEventListener("click", () => {
    if (!localEntries().length) { showToast("当前没有需要清除的个人记录"); return; }
    if (window.confirm("确认清除当前设备上的个人记录吗？演示数据会保留。")) { localStorage.removeItem(STORAGE_KEY); renderJourney(); showToast("个人记录已从当前设备清除"); }
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); privacyModal.classList.remove("open"); } });
  $("#charCount").textContent = `${$("#journalText").value.length} / 300`;
  updateInsight();
}

init();
