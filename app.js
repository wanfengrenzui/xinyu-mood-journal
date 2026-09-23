const ENTRY_KEY = "xinyu-mood-entries-v2";
const LEGACY_ENTRY_KEY = "xinyu-mood-entries-v1";
const FEEDBACK_KEY = "xinyu-care-feedback-v2";
const DRAFT_KEY = "xinyu-record-draft-v1";

const moodConfig = {
  "低落": { score: 25, color: "#81799c", headline: "这份低落不需要立刻消失，它更需要先被看见。" },
  "焦虑": { score: 35, color: "#9b765f", headline: "当思绪跑得很快时，可以先让身体慢下来。" },
  "疲惫": { score: 42, color: "#778986", headline: "你可能不是不够努力，只是已经连续消耗了一段时间。" },
  "平静": { score: 64, color: "#617864", headline: "此刻的平静值得被记住，它是可以再次回到的地方。" },
  "轻松": { score: 78, color: "#d49b68", headline: "轻松不是浪费时间，而是身心重新获得了空间。" },
  "开心": { score: 92, color: "#d17f55", headline: "这份开心很珍贵，值得留下它发生的线索。" }
};

const inferenceCopy = {
  "工作负荷": "这可能与任务持续占用注意力有关。即使事情暂停，大脑仍可能停留在未完成状态。",
  "学业压力": "这可能与截止时间、自我期待和结果不确定性叠加有关。",
  "人际关系": "关系中的不确定感可能正在占用注意力；你未必需要立刻得到结论。",
  "睡眠不足": "睡眠不足可能放大情绪敏感度。先恢复身体，再评价自己会更公平。",
  "身体状态": "身体的不适可能比语言更早发出信号，先回应身体也是照顾情绪。",
  "自我期待": "你可能把结果和自我评价绑得很紧，暂时缩小下一步会更容易开始。",
  "说不清": "暂时找不到原因也很正常。以下只是基于当前信息的弱推测，不是确定判断。"
};

const careCatalog = {
  breath: { label: "慢呼吸", icon: "○", duration: 1, summary: "降低身体唤醒水平", description: "用更长的呼气帮助身体从紧绷状态慢下来。" },
  stretch: { label: "身体伸展", icon: "⌒", duration: 3, summary: "释放肩颈与久坐紧绷", description: "三步轻柔动作，让身体先从持续用力中松开。" },
  ground: { label: "五感着陆", icon: "◇", duration: 3, summary: "把注意力带回当下", description: "依次寻找看见、听见和触碰到的事物，减少思绪反刍。" },
  note: { label: "保存此刻", icon: "+", duration: 1, summary: "留下积极状态的线索", description: "写下今天值得保留的一个瞬间，帮助未来重新找到它。" }
};

const demoFeedback = {
  breath: { better: 3, same: 1, worse: 0, totalDelta: 5 },
  stretch: { better: 4, same: 1, worse: 0, totalDelta: 7 },
  ground: { better: 2, same: 1, worse: 0, totalDelta: 3 },
  note: { better: 2, same: 0, worse: 0, totalDelta: 2 }
};

const riskWords = ["不想活", "自杀", "结束生命", "伤害自己", "活着没意思", "想死", "去死"];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let selectedMoods = ["平静"];
let recordMode = "quick";
let dataMode = "demo";
let periodDays = 7;
let recommendedOrder = ["breath", "stretch", "ground"];
let activeCare = "breath";
let currentEntryId = null;
let evidenceIds = [];
let analysisTimers = [];
let practiceTimer = null;
let toastTimer = null;

function daysAgo(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildDemoEntries() {
  const seeds = [
    [0,"平静",66,3,["说不清"],["没有明显感觉"],"给自己留了一段没有安排的时间。","家里"],
    [1,"疲惫",44,4,["工作负荷","睡眠不足"],["肩颈紧绷","身体疲惫"],"项目临近交付，晚上还在反复确认细节。","办公室"],
    [2,"轻松",78,3,["人际关系"],["没有明显感觉"],"和很久没见的朋友吃饭，聊了很多近况。","家里"],
    [3,"低落",31,4,["工作负荷","自我期待"],["胸口发紧"],"会议上没有表达清楚自己的想法，有点懊恼。","办公室"],
    [4,"疲惫",45,3,["睡眠不足","身体状态"],["身体疲惫","睡意不足"],"昨晚睡得很晚，今天注意力总是飘走。","学校"],
    [5,"开心",90,4,["人际关系"],["没有明显感觉"],"朋友记得我随口提过的一件小事。","家里"],
    [6,"焦虑",37,4,["工作负荷","自我期待"],["心跳变快","肩颈紧绷"],"想到明天的汇报，脑子里一直排练可能出错的地方。","睡前"],
    [9,"平静",63,2,["身体状态"],["没有明显感觉"],"下班后散步了二十分钟。","家里"],
    [12,"疲惫",41,4,["工作负荷"],["肩颈紧绷"],"连续处理了很多临时任务。","办公室"],
    [15,"轻松",75,3,["人际关系"],["没有明显感觉"],"拒绝了一个不必要的安排。","家里"],
    [19,"焦虑",36,4,["学业压力","睡眠不足"],["心跳变快"],"担心准备不够充分，睡前还在查资料。","睡前"],
    [23,"开心",88,4,["自我期待"],["没有明显感觉"],"完成了一件拖了很久的事情。","家里"],
    [27,"低落",33,3,["人际关系"],["胸口发紧"],"一段对话没有得到期待中的回应。","通勤途中"]
  ];
  return seeds.map((s, i) => ({ id:`demo-${i}`, date:daysAgo(s[0]), moods:[s[1]], mood:s[1], score:s[2], intensity:s[3], triggers:s[4], bodies:s[5], text:s[6], scene:s[7], availableTime:3, demo:true }));
}
const demoEntries = buildDemoEntries();

function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function localEntries() {
  const current = readJSON(ENTRY_KEY, []);
  if (current.length) return current;
  return readJSON(LEGACY_ENTRY_KEY, []).map((entry) => ({ ...entry, moods: entry.moods || [entry.mood], bodies: entry.bodies || [], scene: entry.scene || "家里", availableTime: entry.availableTime || 3 }));
}
function careFeedback() { return readJSON(FEEDBACK_KEY, {}); }
function selectedValues(container) { return $$(`${container} button.selected`).map((button) => button.dataset.value); }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value); return div.innerHTML; }
function todayString() { return daysAgo(0); }
function formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { month:"short", day:"numeric" }).format(new Date(`${value}T12:00:00`)); }
function showToast(message) { const toast=$("#toast"); toast.textContent=message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2600); }
function openModal(html) { $("#modalContent").innerHTML=html; $("#modal").classList.add("open"); $("#modal").setAttribute("aria-hidden","false"); }
function closeModal() { $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden","true"); clearInterval(practiceTimer); }
function containsRisk(text) { return riskWords.some((word)=>text.includes(word)); }
function moodColor(mood) { return (moodConfig[mood] || moodConfig["平静"]).color; }
function countValues(values) { return values.reduce((acc,value)=>{acc[value]=(acc[value]||0)+1;return acc;},{}); }
function topPair(object, fallback=["暂无",0]) { return Object.entries(object).sort((a,b)=>b[1]-a[1])[0] || fallback; }

function setFlowStep(step) { $$("#flowGuide li").forEach((item,index)=>item.classList.toggle("active", index===step-1)); }
function switchPage(page) {
  $$(".nav-item").forEach((item)=>item.classList.toggle("active",item.dataset.page===page));
  ["today","journey","care","about"].forEach((name)=>$(`#${name}Page`).classList.toggle("active",name===page));
  if(page==="journey") renderJourney();
  if(page==="care") renderCareLibrary();
  window.scrollTo({top:0,behavior:"smooth"});
}

function setRecordMode(mode) {
  recordMode=mode;
  $$("[data-record-mode]").forEach((button)=>button.classList.toggle("active",button.dataset.recordMode===mode));
  $("#fullFields").hidden=mode!=="full";
  saveDraft();
}

function markDirty() {
  currentEntryId=null;
  if(!$("#insightResult").hidden) {
    $("#insightResult").hidden=true; $("#insightEmpty").hidden=false; $("#insightCard").classList.add("empty");
    $("#insightMeta").textContent="等待更新记录"; lockCare();
  }
  saveDraft();
}

function saveDraft() {
  const draft={moods:selectedMoods,intensity:Number($("#intensity").value),text:$("#journalText").value,triggers:selectedValues("#triggerOptions"),bodies:selectedValues("#bodyOptions"),scene:$("#scene").value,availableTime:Number($("#availableTime").value),recordMode};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));
  $("#draftState").textContent=draft.text ? "草稿已自动保存在当前设备" : "内容仅保存在当前设备";
}

function restoreDraft() {
  const draft=readJSON(DRAFT_KEY,null); if(!draft)return;
  selectedMoods=(draft.moods||["平静"]).slice(0,2);
  $$("#moodOptions button").forEach((button)=>button.classList.toggle("selected",selectedMoods.includes(button.dataset.mood)));
  $("#intensity").value=draft.intensity||3; $("#intensityValue").textContent=`${draft.intensity||3} / 5`;
  $("#journalText").value=draft.text||""; $("#charCount").textContent=`${(draft.text||"").length} / 360`;
  ["#triggerOptions","#bodyOptions"].forEach((selector)=>$$(selector+" button").forEach((button)=>button.classList.toggle("selected",(selector.includes("trigger")?draft.triggers:draft.bodies||[]).includes(button.dataset.value))));
  $("#scene").value=draft.scene||"家里"; $("#availableTime").value=String(draft.availableTime||3); setRecordMode(draft.recordMode||"quick");
}

function chooseMood(button) {
  const mood=button.dataset.mood;
  if(selectedMoods.includes(mood)) selectedMoods=selectedMoods.filter((item)=>item!==mood);
  else if(selectedMoods.length<2) selectedMoods.push(mood);
  else { selectedMoods.shift(); selectedMoods.push(mood); }
  if(!selectedMoods.length) selectedMoods=[mood];
  $$("#moodOptions button").forEach((item)=>item.classList.toggle("selected",selectedMoods.includes(item.dataset.mood)));
  setFlowStep(1); markDirty();
}

function selectTag(button, group) {
  if(button.dataset.value==="说不清" && !button.classList.contains("selected")) $$(group+" button").forEach((item)=>item.classList.remove("selected"));
  else if(button.dataset.value!=="说不清") { const unclear=$(group+' button[data-value="说不清"]'); if(unclear) unclear.classList.remove("selected"); }
  button.classList.toggle("selected"); markDirty();
}

function feedbackScore(type) {
  const f=careFeedback()[type]; if(!f)return 0;
  return (f.better||0)*3+(f.same||0)-(f.worse||0)*4;
}
function recommendCare(entry) {
  const scores={breath:0,stretch:0,ground:0,note:0};
  Object.keys(scores).forEach((key)=>scores[key]+=feedbackScore(key));
  if(entry.intensity>=4){scores.breath+=5;scores.ground+=3}
  if(entry.moods.includes("焦虑")){scores.breath+=4;scores.ground+=4}
  if(entry.moods.includes("疲惫")){scores.stretch+=4;scores.breath+=2}
  if(entry.moods.includes("低落")){scores.ground+=3;scores.stretch+=2}
  if(entry.moods.includes("开心")||entry.moods.includes("轻松"))scores.note+=6;
  if(entry.bodies.some((b)=>["肩颈紧绷","身体疲惫"].includes(b)))scores.stretch+=5;
  if(entry.bodies.some((b)=>["胸口发紧","心跳变快"].includes(b)))scores.breath+=4;
  if(entry.triggers.includes("人际关系"))scores.ground+=3;
  if(entry.availableTime===1){scores.breath+=2;scores.note+=2}
  return Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([key])=>key);
}
function careReason(entry,type) {
  const reasons=[];
  if(entry.intensity>=4)reasons.push(`感受强度为 ${entry.intensity}/5`);
  if(entry.bodies.length)reasons.push(`出现“${entry.bodies[0]}”`);
  if(entry.triggers.length)reasons.push(`提到“${entry.triggers[0]}”`);
  const f=careFeedback()[type]; if(f?.better)reasons.push(`这种方法已有 ${f.better} 次有效反馈`);
  return `因为你${reasons.length?reasons.join("、"):"完成了此刻的记录"}，先尝试“${careCatalog[type].label}”更容易开始。推荐只是建议，你可以随时更换或停止。`;
}
function lockCare(){ $("#carePanel").classList.add("locked"); $("#careList").innerHTML=""; $("#careActions").hidden=true; $("#careTitle").textContent="完成记录后获得建议"; }
function displayCareOrder(entry) {
  activeCare=recommendedOrder[0];
  $("#careList").innerHTML=recommendedOrder.map((key,index)=>{const c=careCatalog[key];return `<button class="care-card ${index===0?"featured":""}" data-care="${key}">${index===0?'<span class="badge">此刻更推荐</span>':""}<span class="care-icon">${c.icon}</span><span><strong>${c.label}</strong><small>${c.summary} · ${Math.min(c.duration,entry.availableTime)} 分钟</small></span><i>→</i></button>`}).join("");
  $("#careTitle").textContent=`推荐你先做：${careCatalog[activeCare].label}`; $("#careDuration").textContent=`约 ${Math.min(careCatalog[activeCare].duration,entry.availableTime)} 分钟`; $("#careReason").textContent=careReason(entry,activeCare); $("#carePanel").classList.remove("locked"); $("#careActions").hidden=false;
  $$("[data-care]").forEach((button)=>button.addEventListener("click",()=>openPractice(button.dataset.care,entry)));
}
function renderCareRecommendations(entry) {
  recommendedOrder=recommendCare(entry).slice(0,3);
  displayCareOrder(entry);
}

function buildEntry() {
  const moods=selectedMoods.length?selectedMoods:["平静"];
  const averageBase=Math.round(moods.reduce((sum,m)=>sum+moodConfig[m].score,0)/moods.length);
  const intensity=Number($("#intensity").value);
  const negative=moods.some((m)=>["低落","焦虑","疲惫"].includes(m));
  const adjusted=Math.max(8,Math.min(96,averageBase+(negative?(3-intensity)*4:(intensity-3)*3)));
  return {id:`entry-${Date.now()}`,date:todayString(),createdAt:new Date().toISOString(),moods,mood:moods.join(" · "),score:adjusted,intensity,triggers:selectedValues("#triggerOptions").length?selectedValues("#triggerOptions"):["说不清"],bodies:recordMode==="full"?selectedValues("#bodyOptions"):[],text:$("#journalText").value.trim(),scene:recordMode==="full"?$("#scene").value:"未填写",availableTime:recordMode==="full"?Number($("#availableTime").value):3,demo:false};
}
function buildInsight(entry) {
  const primary=entry.triggers[0]||"说不清";
  const sameTrigger=localEntries().filter((item)=>item.id!==entry.id&&(item.triggers||[]).includes(primary)).length;
  const body=entry.bodies.length?`，身体信号包括“${entry.bodies.join("、")}”`:"";
  const fact=`你记录了“${entry.moods.join("、")}”，明显程度为 ${entry.intensity}/5${body}。`;
  const inference=inferenceCopy[primary]||inferenceCopy["说不清"];
  const history=sameTrigger?`在此前的个人记录中，“${primary}”还出现过 ${sameTrigger} 次。这只是重复出现的关联，不代表因果。`:"个人记录中暂时没有足够的重复样本，当前不生成强趋势判断。";
  const first=recommendCare(entry)[0];
  const next=`先尝试 ${careCatalog[first].duration} 分钟“${careCatalog[first].label}”，完成后比较前后变化；若不适，可以立即停止。`;
  return {headline:moodConfig[entry.moods[0]].headline,fact,inference,history,next};
}
function showInsight(entry) {
  const insight=buildInsight(entry); $("#insightHeadline").textContent=insight.headline; $("#factText").textContent=insight.fact; $("#inferenceText").textContent=insight.inference; $("#historyText").textContent=insight.history; $("#nextText").textContent=insight.next;
  $("#analysisState").hidden=true; $("#insightEmpty").hidden=true; $("#insightResult").hidden=false; $("#insightCard").classList.remove("empty"); $("#insightMeta").textContent="刚刚生成 · 可解释"; renderCareRecommendations(entry); setFlowStep(2);
}
function analyzeEntry() {
  const text=$("#journalText").value.trim(); if(!text){$("#journalText").focus();showToast("写一句发生的事，或使用快捷描述");return} if(containsRisk(text)){openSafety();return}
  analysisTimers.forEach(clearTimeout); $("#insightEmpty").hidden=true; $("#insightResult").hidden=true; $("#analysisState").hidden=false; $("#insightCard").classList.remove("empty"); lockCare(); const button=$("#analyzeButton");button.disabled=true;button.querySelector("span").textContent="正在理解你的记录…";
  const entry=buildEntry(); ["连接触发因素与身体信号","检查近期是否出现重复模式","匹配此刻最容易开始的行动"].forEach((copy,index)=>analysisTimers.push(setTimeout(()=>$("#analysisStep").textContent=copy,300+index*280)));
  analysisTimers.push(setTimeout(()=>{const entries=localEntries();entries.push(entry);localStorage.setItem(ENTRY_KEY,JSON.stringify(entries));currentEntryId=entry.id;showInsight(entry);button.disabled=false;button.querySelector("span").textContent="更新记录并重新分析";$("#streakNumber").textContent=new Set(entries.map((e)=>e.date)).size;showToast("已生成可解释洞察和首选方案");},1150));
}

function openPractice(type,entry) {
  activeCare=type; const c=careCatalog[type]; setFlowStep(3);
  const intro=`<p class="step-label">开始前</p><h2 id="modalTitle">先记住现在的强度</h2><p>当前记录是 ${entry.intensity}/5。练习结束后，我们会再次询问，用变化而不是感觉猜测效果。</p><div class="modal-actions"><button id="beginPractice">开始${c.label}</button><button id="cancelPractice">暂时不做</button></div>`;
  openModal(intro); $("#beginPractice").addEventListener("click",()=>renderPractice(type,entry)); $("#cancelPractice").addEventListener("click",closeModal);
}
function renderPractice(type,entry) {
  if(type==="breath") {
    openModal(`<div class="breathing"><p class="step-label">${careCatalog[type].label}</p><h2 id="modalTitle">跟着圆圈慢慢呼吸</h2><p>圆圈变大时吸气，变小时呼气；无需做到标准。</p><div class="breathing-orb"><span id="breathGuide">准备</span></div><p>剩余 <strong id="seconds">60</strong> 秒</p><div class="modal-actions"><button id="startTimer">开始</button><button id="finishPractice">先到这里</button></div></div>`);
    let seconds=60,running=false;$("#startTimer").addEventListener("click",()=>{if(running)return;running=true;$("#startTimer").textContent="呼吸中";practiceTimer=setInterval(()=>{seconds--;$("#seconds").textContent=seconds;$("#breathGuide").textContent=seconds%10>5?"慢慢吸气":"缓缓呼气";if(seconds<=0){clearInterval(practiceTimer);openAfterRating(type,entry)}},1000)});$("#finishPractice").addEventListener("click",()=>openAfterRating(type,entry));
  } else {
    const steps={stretch:["肩膀向上靠近耳朵，停留 3 秒，再缓缓放下","头部轻轻向左、向右倾斜，各停留 5 秒","双手向前伸展，慢慢呼出一口气"],ground:["找出眼前 3 个颜色不同的物体","听见 2 种远近不同的声音","感受 1 个身体与环境接触的位置"],note:["回想今天值得保留的一瞬间","写下当时发生了什么","为它取一个只有自己懂的小标题"]}[type];
    openModal(`<p class="step-label">${careCatalog[type].label}</p><h2 id="modalTitle">${careCatalog[type].summary}</h2><p>${careCatalog[type].description}</p><div class="practice-steps">${steps.map((s,i)=>`<div>${i+1}. ${s}</div>`).join("")}</div><div class="modal-actions"><button id="finishPractice">完成练习</button><button id="cancelPractice">先停止</button></div>`);$("#finishPractice").addEventListener("click",()=>openAfterRating(type,entry));$("#cancelPractice").addEventListener("click",()=>openAfterRating(type,entry));
  }
}
function openAfterRating(type,entry) {
  clearInterval(practiceTimer); openModal(`<p class="step-label">练习后反馈</p><h2 id="modalTitle">现在的明显程度是多少？</h2><p>练习前是 ${entry.intensity}/5。请选择此刻最接近的感受，没有“应该变好”的标准答案。</p><div class="feedback-grid">${[1,2,3,4,5].map(n=>`<button data-after="${n}">${n}<br><small>${n===1?"很轻":n===5?"很强":""}</small></button>`).join("")}</div><button class="text-button" id="skipFeedback">暂不反馈</button>`); $$('[data-after]').forEach((button)=>button.addEventListener("click",()=>savePracticeFeedback(type,entry.intensity,Number(button.dataset.after))));$("#skipFeedback").addEventListener("click",()=>{closeModal();showToast("已结束练习，不记录效果")});
}
function savePracticeFeedback(type,before,after) {
  const feedback=careFeedback();feedback[type]=feedback[type]||{better:0,same:0,worse:0,totalDelta:0};const result=after<before?"better":after===before?"same":"worse";feedback[type][result]++;feedback[type].totalDelta+=(before-after);localStorage.setItem(FEEDBACK_KEY,JSON.stringify(feedback));setFlowStep(4);
  const copy=result==="better"?["这次有一点帮助","已提高这类方法的推荐优先级。"]:result==="same"?["没有变化也很正常","已记录结果，下次会尝试不同方向。"]:["先停止，不必勉强继续","已降低这类方法的推荐优先级；请回到让你感到安全的环境。"];
  openModal(`<p class="step-label">反馈已记录</p><h2 id="modalTitle">${copy[0]}</h2><p>${copy[1]} 练习前 ${before}/5，练习后 ${after}/5。记录只保存在当前设备。</p><button class="primary-button compact" id="finishFeedback">完成</button>`);$("#finishFeedback").addEventListener("click",()=>{closeModal();renderCareLibrary();showToast("效果反馈已保存")});
}

function entriesForView() { const source=dataMode==="demo"?demoEntries:localEntries(); const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-(periodDays-1));return source.filter((entry)=>new Date(`${entry.date}T12:00:00`)>=cutoff).sort((a,b)=>new Date(a.date)-new Date(b.date)); }
function renderJourney() {
  const entries=entriesForView();const avg=entries.length?Math.round(entries.reduce((s,e)=>s+e.score,0)/entries.length):0;$("#averageScore").textContent=avg||"—";$("#entryCount").textContent=entries.length;$("#periodLabel").textContent=`最近 ${periodDays} 天`;$("#chartTitle").textContent=`最近 ${periodDays} 天`;
  const moods=countValues(entries.flatMap((e)=>e.moods||[e.mood]));const topMood=topPair(moods);$("#commonMood").textContent=topMood[0];$("#commonMoodMeta").textContent=topMood[1]?`${topMood[1]} 次出现`:"等待记录";
  const triggers=countValues(entries.flatMap((e)=>e.triggers||[]));const topTrigger=topPair(triggers);$("#commonTrigger").textContent=topTrigger[0].replace("负荷","");$("#commonTriggerMeta").textContent=topTrigger[1]?`${topTrigger[1]} 次出现`:"等待记录";
  $("#dataNotice").innerHTML=dataMode==="demo"?"<strong>演示数据</strong>仅用于展示，与你的记录严格分开。":entries.length?`当前展示当前设备中的 <strong>${entries.length} 条个人记录</strong>。`:"还没有个人记录，返回“今天”开始第一次觉察。";
  $("#clearEntries").hidden=dataMode!=="mine";$("#exportEntries").hidden=dataMode!=="mine";renderChart(entries);renderEvidence(entries);renderBars(triggers,entries.length);renderBodySummary(entries);renderHistory(entries.slice().reverse());
}
function renderChart(entries) {
  const box=$("#moodChart");if(!entries.length){box.innerHTML='<div class="empty-state">完成记录后，这里会出现你的状态轨迹</div>';return}const w=650,h=230,l=38,r=18,t=18,b=35,iw=w-l-r,ih=h-t-b;const points=entries.map((e,i)=>({x:entries.length===1?l+iw/2:l+i*iw/(entries.length-1),y:t+(100-e.score)/100*ih,e}));const path=points.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");const grid=[25,50,75].map(v=>{const y=t+(100-v)/100*ih;return `<line x1="${l}" y1="${y}" x2="${w-r}" y2="${y}" stroke="#e7e6df" stroke-dasharray="3 5"/><text x="7" y="${y+4}" fill="#999" font-size="9">${v}</text>`}).join("");const nodes=points.map((p,i)=>`<g data-entry-id="${p.e.id}"><circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="${moodColor((p.e.moods||[p.e.mood])[0])}" stroke-width="3"/><text x="${p.x}" y="${h-10}" text-anchor="middle" fill="#888" font-size="9">${i===0||i===points.length-1||entries.length<=7?formatDate(p.e.date).replace("月","/").replace("日",""):""}</text></g>`).join("");box.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="状态变化曲线">${grid}<path d="${path}" fill="none" stroke="#617864" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${nodes}</svg>`;box.querySelectorAll("[data-entry-id]").forEach((node)=>node.addEventListener("click",()=>highlightEntries([node.dataset.entryId])));
}
function renderEvidence(entries) {
  const low=entries.filter((e)=>e.score<50);const counts=countValues(low.flatMap((e)=>e.triggers||[]));const top=topPair(counts,["暂无",0]);evidenceIds=low.filter((e)=>(e.triggers||[]).includes(top[0])).map((e)=>e.id);
  if(low.length>=2&&top[1]>=2){$("#evidenceTitle").textContent=`低状态记录常与“${top[0]}”同时出现`;$("#evidenceBody").textContent=`${low.length} 次低状态记录中，有 ${top[1]} 次包含“${top[0]}”。这是关联观察，不代表因果关系。`;$("#showEvidence").disabled=false}else if(entries.length){$("#evidenceTitle").textContent="暂时没有稳定的重复模式";$("#evidenceBody").textContent=`当前有 ${entries.length} 条记录。继续记录后，心屿才会提高结论强度。`;$("#showEvidence").disabled=true}else{$("#evidenceTitle").textContent="完成记录后生成证据链";$("#evidenceBody").textContent="结论会说明用了哪些记录、出现多少次，并区分观察与推测。";$("#showEvidence").disabled=true}
}
function renderBars(counts,total){const list=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);$("#triggerBars").innerHTML=list.length?list.map(([name,count])=>{const percent=Math.round(count/Math.max(total,1)*100);return `<div><div class="bar-top"><span>${escapeHtml(name)}</span><span>${count} 次 · ${percent}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div></div>`}).join(""):'<div class="empty-state">还没有足够的数据</div>'}
function renderBodySummary(entries){const bodies=countValues(entries.flatMap((e)=>e.bodies||[]).filter((b)=>b!=="没有明显感觉"));const top=topPair(bodies);$("#bodySummary").textContent=top[1]?`身体线索：“${top[0]}”出现 ${top[1]} 次。身体信号只用于自我观察，不用于医学判断。`:"完整记录中加入身体信号后，这里会呈现重复线索。"}
function renderHistory(entries){$("#historyList").innerHTML=entries.length?entries.map((e)=>`<article class="history-item" data-entry-id="${e.id}"><span class="history-date">${formatDate(e.date)}</span><span class="history-mood"><i style="background:${moodColor((e.moods||[e.mood])[0])}"></i>${escapeHtml((e.moods||[e.mood]).join(" · "))}</span><span class="history-text">${escapeHtml(e.text)}</span><span class="history-source">${e.demo?"演示":"我的记录"}</span></article>`).join(""):'<div class="empty-state">还没有记录，先从今天开始吧</div>'; $$(".history-item").forEach((item)=>item.addEventListener("click",()=>showEntryDetail(item.dataset.entryId)))}
function highlightEntries(ids){$$(".history-item").forEach((item)=>item.classList.toggle("highlight",ids.includes(item.dataset.entryId)));$("#historySection").scrollIntoView({behavior:"smooth",block:"center"});showToast(`已定位 ${ids.length} 条相关记录`)}
function showEntryDetail(id){const e=[...demoEntries,...localEntries()].find((item)=>item.id===id);if(!e)return;openModal(`<p class="step-label">${e.demo?"演示记录":"我的记录"} · ${formatDate(e.date)}</p><h2 id="modalTitle">${escapeHtml((e.moods||[e.mood]).join(" · "))} · ${e.intensity}/5</h2><p>${escapeHtml(e.text)}</p><div class="practice-steps"><div>触发线索：${escapeHtml((e.triggers||[]).join("、"))}</div><div>身体信号：${escapeHtml((e.bodies||[]).join("、")||"未记录")}</div><div>场景：${escapeHtml(e.scene||"未记录")}</div></div>`)}

function statsFor(type, source){const item=source[type]||{better:0,same:0,worse:0,totalDelta:0};const attempts=(item.better||0)+(item.same||0)+(item.worse||0);return {attempts,better:item.better||0,rate:attempts?Math.round((item.better||0)/attempts*100):0,delta:item.totalDelta||0}}
function renderCareLibrary(){const feedback=careFeedback();const hasPersonal=Object.keys(feedback).length>0;const source=hasPersonal?feedback:demoFeedback;const ordered=Object.keys(careCatalog).sort((a,b)=>statsFor(b,source).rate-statsFor(a,source).rate);$("#careScoreGrid").innerHTML=ordered.map((key)=>{const c=careCatalog[key],s=statsFor(key,source);return `<article class="care-score-card"><div class="top"><span class="icon">${c.icon}</span><span class="status">${hasPersonal?"我的数据":"演示数据"}</span></div><h3>${c.label}</h3><strong>${s.attempts?s.rate+"%":"—"}</strong><small>${s.attempts?`${s.better}/${s.attempts} 次反馈变好`:"尚未尝试"}</small><div class="mini-track"><i style="width:${s.rate}%"></i></div></article>`}).join("");const best=ordered[0],bestStats=statsFor(best,source);$("#learningTitle").textContent=hasPersonal&&bestStats.attempts?`“${careCatalog[best].label}”目前更适合你。`:"当前展示示例效果，完成练习后将切换为你的结果。";$("#learningBody").textContent=hasPersonal&&bestStats.attempts?`根据 ${bestStats.attempts} 次尝试中的 ${bestStats.better} 次改善反馈生成。样本仍少，后续反馈会继续校准。`:"效果排序来自练习前后的强度变化，不根据流行度推荐。";$("#libraryGrid").innerHTML=Object.entries(careCatalog).map(([key,c])=>`<article class="library-item"><span>${c.duration} 分钟</span><h3>${c.label}</h3><p>${c.description}</p><button class="text-button" data-library-care="${key}">了解练习 →</button></article>`).join("");$$('[data-library-care]').forEach((button)=>button.addEventListener("click",()=>{const c=careCatalog[button.dataset.libraryCare];openModal(`<p class="step-label">关怀练习</p><h2 id="modalTitle">${c.label}</h2><p>${c.description}</p><p>为了正确比较效果，请从“今天”的记录结果进入练习，心屿会保留练习前的强度作为基线。</p><button class="primary-button compact" id="goRecord">去记录此刻</button>`);$("#goRecord").addEventListener("click",()=>{closeModal();switchPage("today")})}))}

function openSafety(){openModal(`<div><p class="step-label">你的安全最重要</p><h2 id="modalTitle">现在请不要独自承受</h2><p>我注意到你写下了可能与人身安全有关的内容。心屿会停止普通建议，这个工具不能替代即时帮助。</p><div class="safety-box">请立刻联系一位你信任的人并告诉对方你现在的情况。如果存在立即危险，请联系当地紧急服务或前往最近的急诊机构，并尽量不要独处。</div><div class="modal-actions"><button id="ackSafety">我会联系他人</button><button id="backSafety">返回记录</button></div></div>`);$("#ackSafety").addEventListener("click",()=>{closeModal();showToast("请优先联系可信任的人，并待在安全环境中")});$("#backSafety").addEventListener("click",closeModal)}
function cycleCare(){if(!currentEntryId)return;const entry=localEntries().find((e)=>e.id===currentEntryId);if(!entry)return;recommendedOrder.push(recommendedOrder.shift());displayCareOrder(entry);showToast("已更换首选方案")}
function rateInsight(rate){localStorage.setItem("xinyu-last-insight-rate",rate);showToast(rate==="yes"?"谢谢确认，这条理解已被标记为贴近":"已降低这类判断的可信度")}
function rateEvidence(){openModal(`<p class="step-label">校准趋势判断</p><h2 id="modalTitle">这个发现符合你的感受吗？</h2><p>记录中的同时出现不一定代表原因，你的反馈能帮助系统保持克制。</p><div class="modal-actions"><button data-rate="yes">比较准确</button><button data-rate="no">不太准确</button></div>`);$$('[data-rate]').forEach((button)=>button.addEventListener("click",()=>{closeModal();showToast("已记录你的校准意见")}))}
function exportEntries(){const entries=localEntries();if(!entries.length){showToast("还没有可导出的个人记录");return}const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),entries,careFeedback:careFeedback()},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`xinyu-records-${todayString()}.json`;a.click();URL.revokeObjectURL(url);showToast("个人记录已导出")}

function fillDemo(){selectedMoods=["疲惫","焦虑"];$$("#moodOptions button").forEach((b)=>b.classList.toggle("selected",selectedMoods.includes(b.dataset.mood)));$("#intensity").value=4;$("#intensityValue").textContent="4 / 5";$("#journalText").value="今天连续开了几场会，回到家还是忍不住想着没完成的工作。";$("#charCount").textContent=`${$("#journalText").value.length} / 360`;$$("#triggerOptions button").forEach((b)=>b.classList.toggle("selected",["工作负荷","睡眠不足"].includes(b.dataset.value)));setRecordMode("full");$$("#bodyOptions button").forEach((b)=>b.classList.toggle("selected",["肩颈紧绷","身体疲惫"].includes(b.dataset.value)));$("#scene").value="家里";$("#availableTime").value="3";saveDraft();$("#recordCard").scrollIntoView({behavior:"smooth",block:"start"});showToast("已填入演示场景，现在可以生成洞察")}

function init(){restoreDraft();$("#streakNumber").textContent=new Set(localEntries().map((e)=>e.date)).size;$$(".nav-item").forEach((b)=>b.addEventListener("click",()=>switchPage(b.dataset.page)));$$('[data-page-link]').forEach((b)=>b.addEventListener("click",()=>switchPage(b.dataset.pageLink)));$$("[data-record-mode]").forEach((b)=>b.addEventListener("click",()=>setRecordMode(b.dataset.recordMode)));$$("#moodOptions button").forEach((b)=>b.addEventListener("click",()=>chooseMood(b)));$("#intensity").addEventListener("input",(e)=>{$("#intensityValue").textContent=`${e.target.value} / 5`;markDirty()});$("#journalText").addEventListener("input",(e)=>{$("#charCount").textContent=`${e.target.value.length} / 360`;markDirty()});$("#showQuickPhrases").addEventListener("click",()=>$("#quickPhrases").hidden=!$("#quickPhrases").hidden);$$("#quickPhrases button").forEach((b)=>b.addEventListener("click",()=>{$("#journalText").value=b.textContent;$("#charCount").textContent=`${b.textContent.length} / 360`;$("#quickPhrases").hidden=true;markDirty()}));$$("#triggerOptions button").forEach((b)=>b.addEventListener("click",()=>selectTag(b,"#triggerOptions")));$$("#bodyOptions button").forEach((b)=>b.addEventListener("click",()=>selectTag(b,"#bodyOptions")));$("#scene").addEventListener("change",markDirty);$("#availableTime").addEventListener("change",markDirty);$("#analyzeButton").addEventListener("click",analyzeEntry);$("#quickDemo").addEventListener("click",fillDemo);$("#viewDemo").addEventListener("click",()=>{dataMode="demo";switchPage("journey")});$("#dismissGuide").addEventListener("click",()=>$("#flowGuide").hidden=true);$("#swapCare").addEventListener("click",cycleCare);$("#skipCare").addEventListener("click",()=>showToast("可以，暂时不做也是一种选择"));$$('[data-insight-rate]').forEach((b)=>b.addEventListener("click",()=>rateInsight(b.dataset.insightRate)));
  $$("#dataMode button").forEach((b)=>b.addEventListener("click",()=>{dataMode=b.dataset.value;$$("#dataMode button").forEach((x)=>x.classList.toggle("active",x===b));renderJourney()}));$$("#periodMode button").forEach((b)=>b.addEventListener("click",()=>{periodDays=Number(b.dataset.value);$$("#periodMode button").forEach((x)=>x.classList.toggle("active",x===b));renderJourney()}));$("#showEvidence").addEventListener("click",()=>highlightEntries(evidenceIds));$("#rateEvidence").addEventListener("click",rateEvidence);$("#exportEntries").addEventListener("click",exportEntries);$("#clearEntries").addEventListener("click",()=>{if(!localEntries().length){showToast("没有需要清除的个人记录");return}if(confirm("确认清除当前设备上的全部个人记录吗？此操作无法撤销。")){localStorage.removeItem(ENTRY_KEY);localStorage.removeItem(LEGACY_ENTRY_KEY);renderJourney();showToast("个人记录已清除")}});
  $("#closeModal").addEventListener("click",closeModal);$("#modal").addEventListener("click",(e)=>{if(e.target===e.currentTarget)closeModal()});const privacy=$("#privacyModal");const closePrivacy=()=>{privacy.classList.remove("open");privacy.setAttribute("aria-hidden","true")};$("#privacyButton").addEventListener("click",()=>{privacy.classList.add("open");privacy.setAttribute("aria-hidden","false")});$("#closePrivacy").addEventListener("click",closePrivacy);$("#understandPrivacy").addEventListener("click",closePrivacy);privacy.addEventListener("click",(e)=>{if(e.target===e.currentTarget)closePrivacy()});document.addEventListener("keydown",(e)=>{if(e.key==="Escape"){closeModal();closePrivacy()}});lockCare();renderCareLibrary();}
init();
