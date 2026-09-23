const STORAGE_KEY = "xinyu-mood-entries-v1";
const FEEDBACK_KEY = "xinyu-care-feedback-v1";

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

const carePlans = {
  "低落": {
    breath: ["先陪自己安静一分钟", "不用振作，只需要慢慢呼吸"],
    music: ["听一段有陪伴感的声音", "给情绪一点不被催促的空间"],
    stretch: ["去窗边走动三分钟", "让身体先接触一点光和空气"]
  },
  "疲惫": {
    breath: ["做一次放松呼吸", "呼气比吸气更慢一点"],
    music: ["播放低刺激环境音", "让注意力暂时离开任务"],
    stretch: ["做一次肩颈伸展", "适合久坐和会议之后"]
  },
  "平静": {
    breath: ["跟随呼吸，留住平静", "吸气 4 秒 · 呼气 6 秒"],
    music: ["播放轻柔环境音", "把这份安稳延长一点"],
    stretch: ["做一次全身舒展", "记住身体放松时的感觉"]
  },
  "轻松": {
    breath: ["做一分钟专注呼吸", "感受此刻没有负担的身体"],
    music: ["收藏一段轻快声音", "给今天留下一个愉快锚点"],
    stretch: ["出门走动五分钟", "把松弛感带到接下来的生活里"]
  },
  "开心": {
    breath: ["停一分钟记住喜悦", "留意此刻身体哪里最轻盈"],
    music: ["播放一首想分享的歌", "为今天保存一段情绪记忆"],
    stretch: ["起身活动一下", "让好状态自然流动起来"]
  }
};

const careLabels = { breath: "慢呼吸", music: "环境音", stretch: "身体伸展" };
const riskWords = ["不想活", "自杀", "结束生命", "伤害自己", "活着没意思", "想死"];
let selectedMood = "平静";
let selectedScore = 62;
let breathingTimer = null;
let toastTimer = null;
let analysisTimers = [];
let dataMode = "demo";
let preferredCare = "breath";
let evidenceIds = [];
let hasInsightResult = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function localEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function careFeedback() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}"); }
  catch { return {}; }
}

function entriesForMode() {
  const entries = dataMode === "demo" ? demoEntries : localEntries();
  return entries.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
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
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function switchPage(page) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  $("#todayPage").classList.toggle("active", page === "today");
  $("#journeyPage").classList.toggle("active", page === "journey");
  if (page === "journey") { renderJourney(); setGuideStep(4); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setInsightState(state) {
  const card = $("#insightCard");
  card.classList.toggle("empty", state === "empty");
  card.classList.toggle("analyzing", state === "analyzing");
  $("#insightEmpty").hidden = state !== "empty";
  $("#analysisState").hidden = state !== "analyzing";
  $("#insightResult").hidden = state !== "result";
}

function resetResult() {
  if (!hasInsightResult) return;
  hasInsightResult = false;
  setInsightState("empty");
  $("#insightTime").textContent = "等待更新记录";
  $("#careSection").classList.add("locked");
  $("#careHeadingTitle").textContent = "更新记录后获得首选方案";
  $("#careReason").textContent = "推荐会综合你的情绪、强度、触发因素与近期反馈生成。";
  $("#careControls").hidden = true;
  $$(".care-card").forEach((card) => { card.disabled = true; card.classList.remove("featured"); });
}

function getPreferredCare(primaryTrigger, intensity) {
  const history = careFeedback();
  const positivelyRated = Object.entries(history)
    .filter(([, value]) => (value.better || 0) > (value.worse || 0))
    .sort((a, b) => (b[1].better || 0) - (a[1].better || 0))[0];
  if (positivelyRated && selectedMood !== "开心") return positivelyRated[0];
  if (intensity >= 4) return "breath";
  if (primaryTrigger === "身体状态" || primaryTrigger === "睡眠不足") return "stretch";
  if (primaryTrigger === "人际关系" || selectedMood === "开心") return "music";
  return "breath";
}

function buildCareReason(primaryTrigger, intensity, careType) {
  const actionReason = {
    breath: "先降低身体的唤醒水平，比继续分析问题更容易开始",
    music: "先给注意力一个低刺激的落点，能减少反复思考",
    stretch: "身体线索更突出，先松开肌肉紧绷更直接"
  }[careType];
  const history = careFeedback()[careType];
  const learned = history && history.better ? `；你曾有 ${history.better} 次反馈这种方式有效` : "";
  return `因为你选择了“${selectedMood}”，强度为 ${intensity}/5，并提到“${primaryTrigger}”。${actionReason}${learned}。`;
}

function updateInsightResult() {
  const triggers = $$("#triggerOptions button.selected").map((button) => button.dataset.trigger);
  const primaryTrigger = triggers[0] || "说不清";
  const intensity = Number($("#intensity").value);
  const intensityNote = intensity >= 4
    ? " 这种感受现在比较明显，今晚更适合先降低负荷，而不是继续要求自己解决所有问题。"
    : intensity <= 2
      ? " 它目前还比较轻微，及时看见它，也许能帮助你避免继续累积。"
      : "";
  $("#insightTitle").textContent = moodConfig[selectedMood].title;
  $("#insightBody").textContent = `${insightBodies[primaryTrigger]}${intensityNote}`;
  $("#insightTags").innerHTML = (triggers.length ? triggers : ["继续观察"]).map((trigger) => `<span>${escapeHtml(trigger)}</span>`).join("");
  updateCarePlan(primaryTrigger, intensity);
}

function updateCarePlan(primaryTrigger, intensity) {
  const plan = carePlans[selectedMood] || carePlans["平静"];
  [["breath", plan.breath], ["music", plan.music], ["stretch", plan.stretch]].forEach(([key, copy]) => {
    $(`#${key}Title`).textContent = copy[0];
    $(`#${key}Subtitle`).textContent = copy[1];
  });
  preferredCare = getPreferredCare(primaryTrigger, intensity);
  $$(".care-card").forEach((card) => {
    card.disabled = false;
    card.classList.toggle("featured", card.dataset.care === preferredCare);
  });
  $("#careSection").classList.remove("locked");
  $("#careHeadingTitle").textContent = `推荐你先做：${careLabels[preferredCare]}`;
  $("#careDuration").textContent = preferredCare === "stretch" ? "约 3 分钟" : "约 1 分钟";
  $("#careReason").textContent = buildCareReason(primaryTrigger, intensity, preferredCare);
  $("#careControls").hidden = false;
}

function setGuideStep(step) {
  $$("#demoGuide li").forEach((item, index) => item.classList.toggle("active", index === step - 1));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function containsRisk(text) {
  return riskWords.some((word) => text.includes(word));
}

function clearAnalysisTimers() {
  analysisTimers.forEach(clearTimeout);
  analysisTimers = [];
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

  clearAnalysisTimers();
  setInsightState("analyzing");
  $("#insightTime").textContent = "正在综合 4 类线索";
  $("#careSection").classList.add("locked");
  $("#careControls").hidden = true;
  $$(".care-card").forEach((card) => { card.disabled = true; card.classList.remove("featured"); });
  const saveButton = $("#saveEntryButton");
  saveButton.disabled = true;
  saveButton.querySelector("span").textContent = "正在理解你的记录…";
  if (window.innerWidth < 900) $("#insightCard").scrollIntoView({ behavior: "smooth", block: "center" });

  analysisTimers.push(setTimeout(() => { $("#analysisStep").textContent = "再连接触发因素与身体线索"; }, 430));
  analysisTimers.push(setTimeout(() => { $("#analysisStep").textContent = "最后匹配此刻可执行的小行动"; }, 850));
  analysisTimers.push(setTimeout(() => {
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
    updateInsightResult();
    setInsightState("result");
    hasInsightResult = true;
    $("#insightTime").textContent = "刚刚生成 · 可解释";
    $("#saveState").textContent = "已安全保存在当前设备";
    $("#streakNumber").textContent = Math.max(1, new Set(entries.map((entry) => entry.date)).size);
    saveButton.disabled = false;
    saveButton.querySelector("span").textContent = "已完成 · 重新分析本次记录";
    setGuideStep(3);
    showToast("已生成洞察与首选关怀方案");
  }, 1250));
}

function moodColor(mood) {
  return (moodConfig[mood] || moodConfig["平静"]).color;
}

function renderJourney() {
  const entries = entriesForMode();
  const recent = entries.slice(-7);
  const average = recent.length ? Math.round(recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length) : 0;
  $("#averageScore").textContent = average || "—";
  $("#averageMeta").textContent = recent.length ? "根据情绪与强度换算，仅看趋势" : "完成记录后生成";
  $("#weeklyCount").textContent = recent.length;

  const moodCounts = countValues(recent.map((entry) => entry.mood));
  const topMood = topPair(moodCounts, ["暂无", 0]);
  $("#commonMood").textContent = topMood[0];
  $("#commonMoodMeta").textContent = topMood[1] ? `${topMood[1]} 次记录` : "等待记录";

  const triggerCounts = countValues(recent.flatMap((entry) => entry.triggers));
  const topTrigger = topPair(triggerCounts, ["暂无", 0]);
  $("#commonTrigger").textContent = topTrigger[0].replace("负荷", "");
  $("#commonTriggerMeta").textContent = recent.length ? `占当前记录 ${Math.round(topTrigger[1] / recent.length * 100)}%` : "等待记录";

  $("#dataNotice").innerHTML = dataMode === "demo"
    ? "<strong>当前展示演示数据</strong>，用于快速了解完整体验。你的记录不会与演示数据混合。"
    : localEntries().length
      ? `<strong>当前仅展示我的记录</strong>，共 ${localEntries().length} 条，内容只保存在本设备。`
      : "<strong>还没有个人记录</strong>，返回今天完成一次记录后，这里会生成你的趋势。";
  $("#clearEntries").hidden = dataMode !== "mine";

  renderChart(recent);
  renderEvidence(recent);
  renderTriggerBars(triggerCounts, recent.length);
  renderHistory(entries.slice().reverse().slice(0, 8));
}

function countValues(values) {
  return values.reduce((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {});
}

function topPair(object, fallback) {
  return Object.entries(object).sort((a, b) => b[1] - a[1])[0] || fallback;
}

function renderEvidence(entries) {
  const lowEntries = entries.filter((entry) => entry.score < 50);
  const lowTriggerCounts = countValues(lowEntries.flatMap((entry) => entry.triggers));
  const topTrigger = topPair(lowTriggerCounts, ["暂无明显线索", 0]);
  evidenceIds = lowEntries.filter((entry) => entry.triggers.includes(topTrigger[0])).map((entry) => entry.id);

  if (lowEntries.length >= 2 && topTrigger[1] >= 2) {
    $("#evidenceTitle").textContent = `低能量记录常与“${topTrigger[0]}”同时出现`;
    $("#evidenceBody").textContent = `${lowEntries.length} 次低能量记录中，有 ${topTrigger[1]} 次同时出现“${topTrigger[0]}”。这是基于当前记录的关联观察，不代表因果关系。`;
    $("#showEvidence").disabled = false;
  } else if (entries.length) {
    $("#evidenceTitle").textContent = "目前还没有足够稳定的重复模式";
    $("#evidenceBody").textContent = `当前共有 ${entries.length} 条记录。再持续几次，心屿会优先寻找重复出现的情绪与触发线索。`;
    $("#showEvidence").disabled = true;
  } else {
    $("#evidenceTitle").textContent = "完成记录后生成证据链";
    $("#evidenceBody").textContent = "结论会说明使用了哪些记录、出现了多少次，并明确区分观察与推测。";
    $("#showEvidence").disabled = true;
  }
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
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${(top + innerHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(top + innerHeight).toFixed(1)} Z`;
  const grid = [25, 50, 75].map((value) => {
    const y = top + (100 - value) / 100 * innerHeight;
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e8e7e1" stroke-width="1" stroke-dasharray="3 5"/><text x="5" y="${y+4}" fill="#9a9d95" font-size="10">${value}</text>`;
  }).join("");
  const nodes = points.map((point) => `<g data-entry-id="${escapeHtml(point.entry.id)}"><title>${formatDate(point.entry.date)} · ${escapeHtml(point.entry.mood)} · ${point.entry.score}/100</title><circle cx="${point.x}" cy="${point.y}" r="5" fill="#fff" stroke="${moodColor(point.entry.mood)}" stroke-width="3"/><text x="${point.x}" y="${height-12}" text-anchor="middle" fill="#858981" font-size="10">${formatDate(point.entry.date).replace("月", "/").replace("日", "")}</text></g>`).join("");
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="七天情绪能量曲线"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#91a28e" stop-opacity=".28"/><stop offset="100%" stop-color="#91a28e" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${areaPath}" fill="url(#area)"/><path d="${path}" fill="none" stroke="#657c68" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${nodes}</svg>`;
  container.querySelectorAll("[data-entry-id]").forEach((node) => node.addEventListener("click", () => highlightEntries([node.dataset.entryId])));
}

function renderTriggerBars(counts, total) {
  const container = $("#triggerBars");
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 4);
  if (!sorted.length) { container.innerHTML = '<div class="empty-state">还没有足够的数据</div>'; return; }
  container.innerHTML = sorted.map(([name, count], index) => {
    const percent = Math.round(count / Math.max(total, 1) * 100);
    const colors = ["#657c68", "#81799c", "#d49b68", "#96a092"];
    return `<div><div class="trigger-bar-top"><span>${escapeHtml(name)}</span><span>${count} 次 · ${percent}%</span></div><div class="trigger-bar-track"><div class="trigger-bar-fill" style="width:${percent}%;background:${colors[index]}"></div></div></div>`;
  }).join("");
}

function renderHistory(entries) {
  const container = $("#historyList");
  if (!entries.length) { container.innerHTML = '<div class="empty-state">还没有记录，先从今天开始吧</div>'; return; }
  container.innerHTML = entries.map((entry) => `<article class="history-item" data-entry-id="${escapeHtml(entry.id)}"><span class="history-date">${formatDate(entry.date)}</span><span class="history-mood"><i style="background:${moodColor(entry.mood)}"></i>${escapeHtml(entry.mood)}</span><span class="history-text">${escapeHtml(entry.text)}</span><span>${entry.demo ? "演示记录" : "我的记录"}</span></article>`).join("");
}

function highlightEntries(ids) {
  $$(".history-item").forEach((item) => item.classList.toggle("evidence-hit", ids.includes(item.dataset.entryId)));
  $("#historySection").scrollIntoView({ behavior: "smooth", block: "center" });
  showToast(ids.length > 1 ? `已标出支撑结论的 ${ids.length} 条记录` : "已定位到对应记录");
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

function openCareFeedback(careType) {
  clearInterval(breathingTimer);
  openModal(`<div class="feedback-panel"><span class="step-label">关怀效果反馈</span><h2 id="modalTitle">现在感觉有一点变化吗？</h2><p>没有标准答案。你的反馈会帮助心屿逐渐知道，什么方式真正适合你。</p><div class="feedback-options"><button data-feedback="better"><span>↗</span>好一些</button><button data-feedback="same"><span>→</span>差不多</button><button data-feedback="worse"><span>↘</span>更难受了</button></div></div>`);
  $$("[data-feedback]").forEach((button) => button.addEventListener("click", () => saveCareFeedback(careType, button.dataset.feedback)));
}

function saveCareFeedback(careType, result) {
  const feedback = careFeedback();
  feedback[careType] = feedback[careType] || { better: 0, same: 0, worse: 0 };
  feedback[careType][result] += 1;
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));

  const copy = {
    better: ["这次方式对你有帮助", `已记住“${careLabels[careType]}”的有效反馈，后续会提高它的推荐优先级。`],
    same: ["没有变化也很正常", "已记录这次结果。你可以换一种更低成本的方式，或先什么都不做。"],
    worse: ["先停止练习，照顾安全感", "已降低这类方案的推荐优先级。现在更建议联系可信任的人，或回到让你感觉安全的环境。"]
  }[result];
  openModal(`<div class="feedback-panel"><span class="step-label">反馈已记录</span><h2 id="modalTitle">${copy[0]}</h2><p class="feedback-note">${copy[1]}</p><button class="primary-button small" id="finishFeedback">返回今天</button></div>`);
  $("#finishFeedback").addEventListener("click", () => { closeModal(); showToast("反馈已保存，只留在当前设备"); });
}

function openBreathing() {
  openModal(`<div class="breathing-stage"><span class="step-label">一分钟呼吸空间</span><h2 id="modalTitle">跟着圆圈，慢慢呼吸</h2><p>圆圈变大时吸气，变小时呼气。无需做到标准，只需要比刚才慢一点。</p><div class="breathing-orb"><span id="breathGuide">准备好了吗</span></div><div class="breathing-time">剩余 <strong id="breathSeconds">60</strong> 秒</div><div class="modal-actions"><button id="startBreathing">开始</button><button id="finishBreathing">先到这里</button></div></div>`);
  let seconds = 60, running = false;
  $("#startBreathing").addEventListener("click", () => {
    if (running) return;
    running = true;
    $("#startBreathing").textContent = "呼吸中";
    $("#breathGuide").textContent = "慢慢吸气";
    breathingTimer = setInterval(() => {
      seconds -= 1;
      $("#breathSeconds").textContent = seconds;
      $("#breathGuide").textContent = seconds % 10 > 5 ? "慢慢吸气" : "缓缓呼气";
      if (seconds <= 0) { clearInterval(breathingTimer); openCareFeedback("breath"); }
    }, 1000);
  });
  $("#finishBreathing").addEventListener("click", () => openCareFeedback("breath"));
}

function openMusic() {
  openModal(`<div class="breathing-stage"><span class="step-label">舒缓环境音</span><h2 id="modalTitle">暂时让注意力离开任务</h2><p>这个雏形用动态节奏模拟声音播放状态。闭上眼睛，想象窗外很轻的雨声。</p><div class="sound-bars"><i></i><i></i><i></i><i></i><i></i></div><div class="modal-actions"><button id="finishSound">结束练习</button><button id="switchSound">切换为海浪</button></div></div>`);
  $("#finishSound").addEventListener("click", () => openCareFeedback("music"));
  $("#switchSound").addEventListener("click", (event) => { event.currentTarget.textContent = "正在想象海浪"; });
}

function openStretch() {
  openModal(`<div><span class="step-label">三步身体伸展</span><h2 id="modalTitle">把积累的紧绷放下一点</h2><p>动作保持轻柔。如果感到疼痛，请立即停止。</p><div class="stretch-steps"><div>1. 肩膀向上靠近耳朵，停留 3 秒，再缓缓放下</div><div>2. 头部轻轻向左、向右倾斜，各停留 5 秒</div><div>3. 双手向前伸展，慢慢呼出一口气</div></div><button class="primary-button small" id="finishStretch">完成伸展</button></div>`);
  $("#finishStretch").addEventListener("click", () => openCareFeedback("stretch"));
}

function openSafetyModal() {
  openModal(`<div class="safety-message"><span class="step-label">你的安全最重要</span><h2 id="modalTitle">现在请不要独自承受</h2><p>我注意到你写下了可能与人身安全有关的内容。这个工具不能替代即时帮助，但你值得马上得到真实的支持。</p><div class="support-box">请立刻联系一位你信任的人并告诉对方你现在的情况。如果存在立即危险，请联系当地紧急服务或前往最近的急诊机构，并尽量不要独处。</div><div class="modal-actions"><button id="ackSafety">我会联系他人</button><button id="closeSafety">先返回记录</button></div></div>`);
  $("#ackSafety").addEventListener("click", () => { closeModal(); showToast("请优先联系可信任的人并待在安全环境中"); });
  $("#closeSafety").addEventListener("click", closeModal);
}

function cyclePreferredCare() {
  const order = ["breath", "music", "stretch"];
  preferredCare = order[(order.indexOf(preferredCare) + 1) % order.length];
  $$(".care-card").forEach((card) => card.classList.toggle("featured", card.dataset.care === preferredCare));
  $("#careHeadingTitle").textContent = `换成：${careLabels[preferredCare]}`;
  $("#careReason").textContent = "推荐只是起点。你可以按照此刻的意愿选择另一种更容易开始的方式。";
}

function rateEvidence() {
  openModal(`<div class="feedback-panel"><span class="step-label">校准趋势判断</span><h2 id="modalTitle">这个发现符合你的感受吗？</h2><p>趋势只是基于记录的推测。你的确认会帮助系统避免把“同时出现”误认为“原因”。</p><div class="feedback-options"><button data-evidence-rate="yes"><span>✓</span>比较准确</button><button data-evidence-rate="unsure"><span>?</span>还不确定</button><button data-evidence-rate="no"><span>×</span>不太准确</button></div></div>`);
  $$("[data-evidence-rate]").forEach((button) => button.addEventListener("click", () => {
    closeModal();
    showToast(button.dataset.evidenceRate === "yes" ? "已确认这条观察" : "已记录你的判断，后续会降低结论强度");
  }));
}

function init() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchPage(button.dataset.page)));
  $("#backToRecord").addEventListener("click", () => switchPage("today"));
  $("#startDemoButton").addEventListener("click", () => {
    setGuideStep(1);
    $("#recordCard").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#viewExampleButton").addEventListener("click", () => { dataMode = "demo"; switchPage("journey"); });
  $("#dismissGuide").addEventListener("click", () => $("#demoGuide").classList.add("hidden"));

  $$(".mood-option").forEach((button) => button.addEventListener("click", () => {
    $$(".mood-option").forEach((item) => { item.classList.remove("selected"); item.setAttribute("aria-pressed", "false"); });
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedMood = button.dataset.mood;
    selectedScore = Number(button.dataset.score);
    setGuideStep(2);
    resetResult();
  }));

  $("#intensity").addEventListener("input", (event) => { $("#intensityValue").textContent = `${event.target.value} / 5`; resetResult(); });
  $("#journalText").addEventListener("input", (event) => { $("#charCount").textContent = `${event.target.value.length} / 300`; setGuideStep(2); resetResult(); });
  $$("#triggerOptions button").forEach((button) => button.addEventListener("click", () => { button.classList.toggle("selected"); resetResult(); }));
  $("#saveEntryButton").addEventListener("click", saveEntry);
  $$(".care-card").forEach((button) => button.addEventListener("click", () => {
    if (button.disabled) return;
    ({ breath: openBreathing, music: openMusic, stretch: openStretch })[button.dataset.care]();
  }));
  $("#swapCare").addEventListener("click", cyclePreferredCare);
  $("#skipCare").addEventListener("click", () => showToast("可以，什么都不做也是一种选择"));

  $$(".data-toggle button").forEach((button) => button.addEventListener("click", () => {
    dataMode = button.dataset.mode;
    $$(".data-toggle button").forEach((item) => item.classList.toggle("active", item === button));
    renderJourney();
  }));
  $("#showEvidence").addEventListener("click", () => highlightEntries(evidenceIds));
  $("#rateEvidence").addEventListener("click", rateEvidence);

  $("#closeCareModal").addEventListener("click", closeModal);
  $("#careModal").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });

  const privacyModal = $("#privacyModal");
  const closePrivacy = () => { privacyModal.classList.remove("open"); privacyModal.setAttribute("aria-hidden", "true"); };
  $("#privacyButton").addEventListener("click", () => { privacyModal.classList.add("open"); privacyModal.setAttribute("aria-hidden", "false"); });
  $("#closePrivacyModal").addEventListener("click", closePrivacy);
  $("#understandPrivacy").addEventListener("click", closePrivacy);

  $("#clearEntries").addEventListener("click", () => {
    if (!localEntries().length) { showToast("当前没有需要清除的个人记录"); return; }
    if (window.confirm("确认清除当前设备上的个人记录吗？演示数据会保留。")) {
      localStorage.removeItem(STORAGE_KEY);
      renderJourney();
      showToast("个人记录已从当前设备清除");
    }
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); privacyModal.classList.remove("open"); } });
  $("#charCount").textContent = `${$("#journalText").value.length} / 300`;
  setInsightState("empty");
}

init();
