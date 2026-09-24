const ENTRY_KEY = "xinyu-mood-entries-v2";
const LEGACY_ENTRY_KEY = "xinyu-mood-entries-v1";
const FEEDBACK_KEY = "xinyu-care-feedback-v2";
const DRAFT_KEY = "xinyu-record-draft-v1";
const PLAN_KEY = "xinyu-care-plan-v1";
const EXPERIMENT_KEY = "xinyu-care-experiment-v1";
const PRACTICE_LOG_KEY = "xinyu-practice-log-v1";

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
const demoPracticeLogs = [
  {id:"demo-log-1",date:daysAgo(6),type:"stretch",before:4,after:3,result:"better",moods:["疲惫"],scene:"办公室",entryId:"demo-1",demo:true},
  {id:"demo-log-2",date:daysAgo(4),type:"stretch",before:4,after:2,result:"better",moods:["疲惫","焦虑"],scene:"家里",entryId:"demo-4",demo:true},
  {id:"demo-log-3",date:daysAgo(2),type:"stretch",before:3,after:2,result:"better",moods:["疲惫"],scene:"办公室",entryId:"demo-8",demo:true},
  {id:"demo-log-4",date:daysAgo(1),type:"breath",before:4,after:4,result:"same",moods:["焦虑"],scene:"睡前",entryId:"demo-6",demo:true},
  {id:"demo-log-5",date:daysAgo(0),type:"ground",before:4,after:3,result:"better",moods:["焦虑"],scene:"通勤途中",entryId:"demo-12",demo:true}
];

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
let reviewEvidenceIds = [];
let lastFocusedElement = null;
let experimentMode = "personal";
let strategyMood = "all";
let strategyScene = "all";
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
function currentPlan() { return readJSON(PLAN_KEY, null); }
function currentExperiment() { return readJSON(EXPERIMENT_KEY, null); }
function practiceLogs() { return readJSON(PRACTICE_LOG_KEY, []); }
function selectedValues(container) { return $$(`${container} button.selected`).map((button) => button.dataset.value); }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value); return div.innerHTML; }
function todayString() { return daysAgo(0); }
function formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { month:"short", day:"numeric" }).format(new Date(`${value}T12:00:00`)); }
function showToast(message) { const toast=$("#toast"); toast.textContent=message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2600); }
function openModal(html) { if(!$("#modal").classList.contains("open"))lastFocusedElement=document.activeElement; $("#modalContent").innerHTML=html; $("#modal").classList.add("open"); $("#modal").setAttribute("aria-hidden","false"); setTimeout(()=>$("#closeModal").focus(),0); }
function closeModal() { $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden","true"); clearInterval(practiceTimer); if(lastFocusedElement?.focus)lastFocusedElement.focus(); lastFocusedElement=null; }
function containsRisk(text) { return riskWords.some((word)=>text.includes(word)); }
function moodColor(mood) { return (moodConfig[mood] || moodConfig["平静"]).color; }
function countValues(values) { return values.reduce((acc,value)=>{acc[value]=(acc[value]||0)+1;return acc;},{}); }
function topPair(object, fallback=["暂无",0]) { return Object.entries(object).sort((a,b)=>b[1]-a[1])[0] || fallback; }

function setFlowStep(step) { $$("#flowGuide li").forEach((item,index)=>item.classList.toggle("active", index===step-1)); }
function switchPage(page) {
  $$(".nav-item").forEach((item)=>item.classList.toggle("active",item.dataset.page===page));
  ["today","plan","experiment","journey","care","about"].forEach((name)=>$(`#${name}Page`).classList.toggle("active",name===page));
  if(page==="plan")renderPlan();
  if(page==="experiment"){renderExperiment();setFlowStep(5)}
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
  const exclusiveValue=group==="#triggerOptions"?"说不清":"没有明显感觉";
  if(button.dataset.value===exclusiveValue && !button.classList.contains("selected")) $$(group+" button").forEach((item)=>item.classList.remove("selected"));
  else if(button.dataset.value!==exclusiveValue) { const exclusive=$(group+` button[data-value="${exclusiveValue}"]`); if(exclusive) exclusive.classList.remove("selected"); }
  button.classList.toggle("selected"); markDirty();
}

function feedbackScore(type) {
  const f=careFeedback()[type]; if(!f)return 0;
  return (f.better||0)*3+(f.same||0)-(f.worse||0)*4;
}
function contextEvidenceScore(type,entry) {
  const matches=practiceLogs().filter((log)=>log.type===type&&entry.scene&&entry.scene!=="未填写"&&log.scene===entry.scene&&(log.moods||[]).some((mood)=>entry.moods.includes(mood)));
  if(!matches.length)return 0;
  const delta=matches.reduce((sum,log)=>sum+(log.before-log.after),0);
  return Math.max(-6,Math.min(8,delta*2+matches.filter((log)=>log.result==="better").length));
}
function recommendCare(entry) {
  const scores={breath:0,stretch:0,ground:0,note:0};
  Object.keys(scores).forEach((key)=>scores[key]+=feedbackScore(key)+contextEvidenceScore(key,entry));
  if(entry.intensity>=4){scores.breath+=5;scores.ground+=3}
  if(entry.moods.includes("焦虑")){scores.breath+=4;scores.ground+=4}
  if(entry.moods.includes("疲惫")){scores.stretch+=4;scores.breath+=2}
  if(entry.moods.includes("低落")){scores.ground+=3;scores.stretch+=2}
  if(entry.moods.includes("开心")||entry.moods.includes("轻松"))scores.note+=6;
  if(entry.bodies.some((b)=>["肩颈紧绷","身体疲惫"].includes(b)))scores.stretch+=5;
  if(entry.bodies.some((b)=>["胸口发紧","心跳变快"].includes(b)))scores.breath+=4;
  if(entry.triggers.includes("人际关系"))scores.ground+=3;
  if(entry.scene==="办公室"||entry.scene==="学校"){scores.breath+=2;scores.stretch+=2}
  if(entry.scene==="通勤途中")scores.ground+=4;
  if(entry.scene==="睡前"){scores.breath+=3;scores.ground+=2}
  if(entry.availableTime===1){scores.breath+=3;scores.note+=3;scores.stretch-=2;scores.ground-=2}
  if(entry.availableTime>=10){scores.stretch+=2;scores.ground+=2}
  return Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([key])=>key);
}
function careReason(entry,type) {
  const reasons=[];
  if(entry.intensity>=4)reasons.push(`感受强度为 ${entry.intensity}/5`);
  if(entry.bodies.length)reasons.push(`出现“${entry.bodies[0]}”`);
  if(entry.triggers.length)reasons.push(`提到“${entry.triggers[0]}”`);
  if(entry.scene&&entry.scene!=="未填写")reasons.push(`当前在${entry.scene}`);
  if(entry.availableTime)reasons.push(`愿意投入 ${entry.availableTime} 分钟`);
  const f=careFeedback()[type]; if(f?.better)reasons.push(`这种方法已有 ${f.better} 次有效反馈`);
  const contextual=practiceLogs().filter((log)=>log.type===type&&entry.scene&&entry.scene!=="未填写"&&log.scene===entry.scene&&(log.moods||[]).some((mood)=>entry.moods.includes(mood)));
  if(contextual.length)reasons.push(`有 ${contextual.length} 条相似情绪或场景证据`);
  return `因为你${reasons.length?reasons.join("、"):"完成了此刻的记录"}，先尝试“${careCatalog[type].label}”更容易开始。推荐只是建议，你可以随时更换或停止。`;
}
function lockCare(){ $("#carePanel").classList.add("locked"); $("#careList").innerHTML=""; $("#careActions").hidden=true; $("#careTitle").textContent="完成记录后获得建议"; $("#careDuration").textContent="1–3 分钟"; $("#careReason").textContent="推荐会综合情绪、强度、场景、身体信号和历史反馈。"; }
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

function buildPlanSteps(entry, order) {
  const first=careCatalog[order[0]];
  const hasWork=entry.triggers.includes("工作负荷")||entry.triggers.includes("学业压力");
  const hasSleep=entry.triggers.includes("睡眠不足")||entry.scene==="睡前";
  const positive=entry.moods.some((m)=>["开心","轻松","平静"].includes(m));
  return [
    {id:"now",window:"现在 · 1–3 分钟",title:first.label,description:first.description,why:`先回应 ${entry.intensity}/5 的当前强度，降低开始门槛。`,care:order[0],done:false},
    {id:"later",window:"今晚 · 2 分钟",title:hasWork?"给任务一个收尾":"给大脑一个收尾信号",description:hasWork?"写下明天最先处理的一件事，然后允许今天到此为止。":hasSleep?"把屏幕放远一点，做三轮慢呼吸后再准备入睡。":"记录一件今晚不再继续处理的事。",why:hasWork?"减少未完成任务继续占用注意力。":"避免把一次练习当作唯一解决方案。",done:false},
    {id:"tomorrow",window:"明天 · 1 分钟",title:positive?"保存有效线索":"只安排一个最小行动",description:positive?"回想今天什么帮助你接近这种状态，并保留一个可复用条件。":"选择一件五分钟内能开始的小事，不要求一次完成。",why:"让下一次记录可以验证计划是否真的可执行。",done:false}
  ];
}
function createCarePlan(entry, rotate=false) {
  const order=recommendCare(entry).slice(0,3); if(rotate)order.push(order.shift());
  const previous=currentPlan(); const steps=buildPlanSteps(entry,order);
  if(previous?.entry?.id===entry.id)steps.forEach((step)=>{const old=previous.steps.find((item)=>item.id===step.id);if(old)step.done=rotate&&step.id==="now"?false:old.done});
  const plan={id:`plan-${entry.id}`,createdAt:new Date().toISOString(),entry:{...entry},order,steps,source:"我的记录",adjustment:rotate?"已根据你的反馈更换首选方向":""};
  localStorage.setItem(PLAN_KEY,JSON.stringify(plan)); renderPlan();
}
function demoPlan() {
  const entry=demoEntries[1]; return {id:"demo-plan",entry,order:["stretch","breath","ground"],source:"演示计划",steps:buildPlanSteps(entry,["stretch","breath","ground"]),demo:true,adjustment:""};
}
function completePlanStep(id) {
  const plan=currentPlan(); if(!plan)return; const step=plan.steps.find((item)=>item.id===id); if(!step)return; step.done=!step.done; localStorage.setItem(PLAN_KEY,JSON.stringify(plan)); renderPlan(); showToast(step.done?"已完成一个关怀节点":"已恢复为待完成");
}
function renderPlan() {
  const stored=currentPlan(); const plan=stored||demoPlan(); const expired=Boolean(stored&&Date.now()-new Date(stored.createdAt).getTime()>86400000); const done=plan.steps.filter((step)=>step.done).length;
  $("#planSource").textContent=expired?"这份计划已超过 24 小时":stored?`基于 ${formatDate(plan.entry.date)} 的记录 · 仅存本机`:"演示计划 · 完成记录后自动替换";
  $("#planHeadline").textContent=expired?"计划已经结束，请从此刻重新开始":stored?`为“${plan.entry.moods.join(" · ")}”生成的轻量计划`:"先看一份三阶段关怀计划示例";
  $("#planReason").textContent=expired?"旧计划保留用于回看，但不会继续把“现在、今晚、明天”当作当前建议。":stored?`当前强度 ${plan.entry.intensity}/5，场景为${plan.entry.scene||"未填写"}。${plan.adjustment||"计划会随练习反馈继续调整。"}`:"它不会要求你立刻变好，只把下一步缩小到可以开始。";
  $("#planProgress").textContent=`${done}/3`;
  $("#planGrid").innerHTML=plan.steps.map((step,index)=>`<article class="plan-step ${step.done?"done":""}"><div class="time"><span>${escapeHtml(step.window)}</span><b>${index+1}</b></div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p><span class="plan-why">安排依据：${escapeHtml(step.why)}</span><button data-plan-step="${step.id}">${expired?"记录此刻并重新生成":step.done?"已完成 · 点击撤销":plan.demo?"先完成一次记录":step.id==="now"?"开始这一步":"标记完成"}</button></article>`).join("");
  $("#planFacts").innerHTML=`<span>情绪 ${escapeHtml(plan.entry.moods.join(" · "))}</span><span>强度 ${plan.entry.intensity}/5</span><span>${escapeHtml(plan.entry.scene||"场景未填写")}</span><span>${careFeedback()[plan.order[0]]?.better?`已有 ${careFeedback()[plan.order[0]].better} 次有效反馈`:"等待效果反馈"}</span>`;
  $$('[data-plan-step]').forEach((button)=>button.addEventListener("click",()=>{if(plan.demo||expired){switchPage("today");showToast(expired?"请记录此刻，生成新的 24 小时计划":"先完成一条记录，生成你的计划");return}const step=plan.steps.find((item)=>item.id===button.dataset.planStep);if(step.id==="now"&&!step.done)openPractice(step.care,plan.entry);else completePlanStep(step.id)}));
}
function adjustPlan(reason) {
  const plan=currentPlan(); if(!plan){closeModal();switchPage("today");return}
  if(reason==="too-much"){plan.steps[2]={...plan.steps[2],title:"明天再决定",description:"不额外安排任务，只在需要时回到心屿。",why:"你反馈当前安排偏多，因此减少计划负担。",done:false};plan.adjustment="已根据反馈减少明日任务";localStorage.setItem(PLAN_KEY,JSON.stringify(plan));renderPlan()}
  if(reason==="timing"){plan.steps[1].window="有空时 · 2 分钟";plan.adjustment="已放宽执行时间，不再绑定今晚";localStorage.setItem(PLAN_KEY,JSON.stringify(plan));renderPlan()}
  if(reason==="direction")createCarePlan(plan.entry,true);
  closeModal();showToast("计划已按你的反馈调整");
}
function openPlanFeedback() { openModal(`<p class="step-label">校准关怀计划</p><h2 id="modalTitle">哪里不适合你？</h2><p>你的纠正会直接改变当前计划，不会被解释成“你不配合”。</p><div class="quick-relief-grid"><button data-plan-adjust="too-much"><strong>安排太多</strong><small>减少后续任务</small></button><button data-plan-adjust="direction"><strong>方向不对</strong><small>更换首选练习</small></button><button data-plan-adjust="timing"><strong>时间不合适</strong><small>放宽执行时点</small></button></div>`); $$('[data-plan-adjust]').forEach((button)=>button.addEventListener("click",()=>adjustPlan(button.dataset.planAdjust))); }

function buildExperiment(entry) {
  const type=recommendCare(entry)[0];
  const c=careCatalog[type];
  return {id:`experiment-${Date.now()}`,createdAt:new Date().toISOString(),status:"active",entry:{...entry},type,goal:3,checkins:[],hypothesis:`当我在“${entry.scene||"当前场景"}”感到“${entry.moods.join(" · ")}”时，${c.label}可能帮助强度下降至少 1 级。`,action:`在未来 7 天内，任选 3 次相似状态尝试 ${c.duration} 分钟“${c.label}”。`,measure:"每次只比较练习前后 1–5 级强度，不要求每次都变好。"};
}
function demoExperiment() {
  const entry=demoEntries[1];
  return {id:"demo-experiment",createdAt:new Date(Date.now()-6*86400000).toISOString(),status:"completed",demo:true,entry,type:"stretch",goal:3,checkins:demoPracticeLogs.filter((log)=>log.type==="stretch"),hypothesis:"当工作消耗伴随肩颈紧绷时，身体伸展可能比继续分析情绪更容易降低强度。",action:"7 天内在相似状态下尝试 3 次身体伸展。",measure:"比较每次练习前后强度，并记录场景差异。"};
}
function createExperimentFromLatest() {
  const latest=localEntries().slice().sort((a,b)=>new Date(b.createdAt||b.date)-new Date(a.createdAt||a.date))[0];
  if(!latest){switchPage("today");showToast("先完成一条记录，再创建微实验");return}
  const existing=currentExperiment();
  if(existing&&existing.status!=="completed"&&!confirm("当前已有未结束的实验，确认用最新记录替换吗？"))return;
  const experiment=buildExperiment(latest);localStorage.setItem(EXPERIMENT_KEY,JSON.stringify(experiment));experimentMode="personal";renderExperiment();showToast("已创建七日关怀微实验");
}
function experimentOutcome(experiment) {
  const logs=experiment.checkins||[];const better=logs.filter((log)=>log.result==="better").length;const delta=logs.reduce((sum,log)=>sum+(log.before-log.after),0);const rate=logs.length?Math.round(better/logs.length*100):0;
  if(logs.length<experiment.goal)return {label:"待验证",copy:`已收集 ${logs.length}/${experiment.goal} 次反馈，还不足以形成方向性结论。`,rate,delta};
  if(rate>=67&&delta>=2)return {label:"初步有效",copy:`${logs.length} 次尝试中 ${better} 次改善，累计下降 ${delta} 级；可以在相似情绪和场景下继续验证。`,rate,delta};
  if(rate<=33)return {label:"可能不适合",copy:`${logs.length} 次尝试中只有 ${better} 次改善。系统会降低该方法在相似场景中的优先级。`,rate,delta};
  return {label:"效果不稳定",copy:`${logs.length} 次反馈结果不一致，暂不把它归为有效或无效。`,rate,delta};
}
function renderExperiment() {
  let personal=currentExperiment();if(personal&&personal.status!=="completed"&&Date.now()-new Date(personal.createdAt).getTime()>7*86400000){personal.status="completed";personal.expired=true;localStorage.setItem(EXPERIMENT_KEY,JSON.stringify(personal))}const experiment=experimentMode==="demo"?demoExperiment():personal;const empty=!experiment;
  $("#experimentStatus").textContent=empty?"等待开始":experiment.demo?"演示实验 · 与个人数据隔离":experiment.expired?"七日周期已结束":experiment.status==="paused"?"实验已暂停":experiment.status==="completed"?"实验已结束":"进行中 · 第 1–7 天";
  $("#experimentTitle").textContent=empty?"从最近一次记录生成一个最小验证。":`${careCatalog[experiment.type].label} × ${experiment.entry.moods.join(" · ")}`;
  $("#experimentHypothesis").textContent=empty?"心屿会写清假设、依据、行动和判断标准；结果只用于调整你的后续推荐。":experiment.hypothesis;
  const checks=empty?[]:experiment.checkins||[];$("#experimentProgress").textContent=`${checks.length}/${empty?3:experiment.goal}`;
  const outcome=empty?{label:"待验证",copy:"至少收集 3 次反馈后，才会形成方向性判断。"}:experimentOutcome(experiment);$("#experimentConfidence").textContent=outcome.label;
  $("#experimentProtocol").innerHTML=empty?'<div class="empty-state">完成一条记录后，可以把首选关怀转成七日微实验。</div>':`<article><span>假设</span><p>${escapeHtml(experiment.hypothesis)}</p></article><article><span>行动</span><p>${escapeHtml(experiment.action)}</p></article><article><span>指标</span><p>${escapeHtml(experiment.measure)}</p></article><article><span>依据</span><p>来自 ${formatDate(experiment.entry.date)} 的“${escapeHtml(experiment.entry.moods.join(" · "))}”记录，强度 ${experiment.entry.intensity}/5，场景为${escapeHtml(experiment.entry.scene||"未填写")}。</p></article>`;
  $("#experimentResultTitle").textContent=empty?"等待第一条反馈":outcome.label;$("#experimentConclusion").textContent=outcome.copy;
  $("#experimentLog").innerHTML=checks.length?checks.map((log,index)=>`<article><b>${index+1}</b><div><strong>${formatDate(log.date)} · ${escapeHtml(log.scene||"未填写")}</strong><span>练习前 ${log.before}/5 → 练习后 ${log.after}/5</span></div><em class="${log.result}">${log.result==="better"?"有改善":log.result==="same"?"无变化":"更强"}</em></article>`).join(""):'<div class="empty-state">每次反馈都会显示前后变化和发生场景</div>';
  $("#showDemoExperiment").textContent=experimentMode==="demo"&&personal?"返回我的实验":"查看七日成果演示";const disabled=empty||experiment.demo||experiment.status!=="active";$("#experimentCheckin").disabled=disabled;$("#pauseExperiment").disabled=empty||experiment.demo||experiment.status==="completed";$("#finishExperiment").disabled=empty||experiment.demo||experiment.status==="completed";$("#pauseExperiment").textContent=experiment?.status==="paused"?"继续实验":"暂停实验";
}
function openExperimentCheckin() {
  const experiment=currentExperiment();if(!experiment||experiment.status!=="active")return;
  const baseline=experiment.entry.intensity;openModal(`<p class="step-label">第 ${(experiment.checkins||[]).length+1} 次实验反馈</p><h2 id="modalTitle">比较这一次练习前后的强度</h2><p>创建实验时是 ${baseline}/5，但每次状态可能不同。请先选择这次练习前的强度，再选择练习后的结果。</p><label class="experiment-before">这次练习前<select id="experimentBefore">${[1,2,3,4,5].map((n)=>`<option value="${n}" ${n===baseline?"selected":""}>${n} / 5</option>`).join("")}</select></label><div class="feedback-grid">${[1,2,3,4,5].map((n)=>`<button data-experiment-after="${n}">${n}<br><small>${n===1?"很轻":n===5?"很强":""}</small></button>`).join("")}</div><button class="text-button" id="cancelExperimentCheckin">这次不记录</button>`);$$('[data-experiment-after]').forEach((button)=>button.addEventListener("click",()=>saveExperimentCheckin(Number($("#experimentBefore").value),Number(button.dataset.experimentAfter))));$("#cancelExperimentCheckin").addEventListener("click",closeModal);
}
function saveExperimentCheckin(before,after) {
  const experiment=currentExperiment();if(!experiment)return;const result=after<before?"better":after===before?"same":"worse";const log={id:`experiment-log-${Date.now()}`,date:todayString(),type:experiment.type,before,after,result,moods:experiment.entry.moods,scene:experiment.entry.scene,entryId:experiment.entry.id,experimentId:experiment.id};experiment.checkins=experiment.checkins||[];experiment.checkins.push(log);if(experiment.checkins.length>=experiment.goal)experiment.status="completed";localStorage.setItem(EXPERIMENT_KEY,JSON.stringify(experiment));const logs=practiceLogs();logs.push(log);localStorage.setItem(PRACTICE_LOG_KEY,JSON.stringify(logs));experimentMode="personal";closeModal();renderExperiment();renderCareLibrary();showToast(experiment.status==="completed"?"实验已完成，已生成初步结论":"已保存一次实验反馈");
}
function toggleExperimentPause() {const experiment=currentExperiment();if(!experiment||experiment.status==="completed")return;experiment.status=experiment.status==="paused"?"active":"paused";localStorage.setItem(EXPERIMENT_KEY,JSON.stringify(experiment));renderExperiment();showToast(experiment.status==="paused"?"实验已暂停，不会催促你":"实验已继续");}
function finishExperimentEarly(){const experiment=currentExperiment();if(!experiment)return;if(!confirm("确认提前结束当前实验吗？已收集的反馈会保留。"))return;experiment.status="completed";localStorage.setItem(EXPERIMENT_KEY,JSON.stringify(experiment));renderExperiment();showToast("实验已结束，现有证据已保留");}
function showExperimentDemo(){if(experimentMode==="demo"&&currentExperiment()){experimentMode="personal";switchPage("experiment");showToast("已返回你的个人实验");return}experimentMode="demo";switchPage("experiment");renderExperiment();showToast("当前为演示实验，不会写入个人数据");}

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
  const confidence=sameTrigger>=3?"较高":sameTrigger>=1?"中等":"探索中";
  return {headline:moodConfig[entry.moods[0]].headline,fact,inference,history,next,confidence};
}
function showInsight(entry) {
  const insight=buildInsight(entry); $("#insightHeadline").textContent=insight.headline; $("#factText").textContent=insight.fact; $("#inferenceText").textContent=insight.inference; $("#historyText").textContent=insight.history; $("#nextText").textContent=insight.next; $("#insightConfidence").textContent=`${insight.confidence}置信度`;
  $("#analysisState").hidden=true; $("#insightEmpty").hidden=true; $("#insightResult").hidden=false; $("#insightCard").classList.remove("empty"); $("#insightMeta").textContent="刚刚生成 · 可解释"; renderCareRecommendations(entry); createCarePlan(entry); setFlowStep(2);
}
function analyzeEntry() {
  const text=$("#journalText").value.trim(); if(!text){$("#journalText").focus();showToast("写一句发生的事，或使用快捷描述");return} if(containsRisk(text)){openSafety();return}
  analysisTimers.forEach(clearTimeout); $("#insightEmpty").hidden=true; $("#insightResult").hidden=true; $("#analysisState").hidden=false; $("#insightCard").classList.remove("empty"); lockCare(); const button=$("#analyzeButton");button.disabled=true;button.querySelector("span").textContent="正在理解你的记录…";
  const entry=buildEntry(); ["连接触发因素与身体信号","检查近期是否出现重复模式","匹配此刻最容易开始的行动"].forEach((copy,index)=>analysisTimers.push(setTimeout(()=>$("#analysisStep").textContent=copy,300+index*280)));
  analysisTimers.push(setTimeout(()=>{const entries=localEntries();const existingIndex=currentEntryId?entries.findIndex((item)=>item.id===currentEntryId):-1;if(existingIndex>=0){entry.id=currentEntryId;entry.createdAt=entries[existingIndex].createdAt;entry.updatedAt=new Date().toISOString();entries[existingIndex]=entry}else{entries.push(entry);currentEntryId=entry.id}localStorage.setItem(ENTRY_KEY,JSON.stringify(entries));showInsight(entry);button.disabled=false;button.querySelector("span").textContent="更新记录并重新分析";$("#streakNumber").textContent=new Set(entries.map((e)=>e.date)).size;showToast(existingIndex>=0?"本次记录已更新":"已生成可解释洞察和首选方案");},1150));
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
  clearInterval(practiceTimer); openModal(`<p class="step-label">练习后反馈</p><h2 id="modalTitle">现在的明显程度是多少？</h2><p>练习前是 ${entry.intensity}/5。请选择此刻最接近的感受，没有“应该变好”的标准答案。</p><div class="feedback-grid">${[1,2,3,4,5].map(n=>`<button data-after="${n}">${n}<br><small>${n===1?"很轻":n===5?"很强":""}</small></button>`).join("")}</div><button class="text-button" id="skipFeedback">暂不反馈</button>`); $$('[data-after]').forEach((button)=>button.addEventListener("click",()=>savePracticeFeedback(type,entry,Number(button.dataset.after))));$("#skipFeedback").addEventListener("click",()=>{closeModal();showToast("已结束练习，不记录效果")});
}
function savePracticeFeedback(type,entry,after) {
  const before=entry.intensity;const feedback=careFeedback();feedback[type]=feedback[type]||{better:0,same:0,worse:0,totalDelta:0};const result=after<before?"better":after===before?"same":"worse";feedback[type][result]++;feedback[type].totalDelta+=(before-after);localStorage.setItem(FEEDBACK_KEY,JSON.stringify(feedback));const logs=practiceLogs();logs.push({id:`practice-${Date.now()}`,date:todayString(),type,before,after,result,moods:entry.moods,scene:entry.scene,entryId:entry.id});localStorage.setItem(PRACTICE_LOG_KEY,JSON.stringify(logs));const plan=currentPlan();if(plan){const now=plan.steps.find((step)=>step.id==="now");if(now&&now.care===type)now.done=true;plan.adjustment=result==="better"?"首个练习有效，保留后续轻量节点":result==="same"?"首个练习无明显变化，后续建议保持克制":"首个练习后感受更强，已降低该方法优先级";localStorage.setItem(PLAN_KEY,JSON.stringify(plan));renderPlan()}setFlowStep(4);
  const copy=result==="better"?["这次有一点帮助","已提高这类方法的推荐优先级。"]:result==="same"?["没有变化也很正常","已记录结果，下次会尝试不同方向。"]:["先停止，不必勉强继续","已降低这类方法的推荐优先级；请回到让你感到安全的环境。"];
  openModal(`<p class="step-label">反馈已记录</p><h2 id="modalTitle">${copy[0]}</h2><p>${copy[1]} 练习前 ${before}/5，练习后 ${after}/5。记录只保存在当前设备。</p><button class="primary-button compact" id="finishFeedback">完成</button>`);$("#finishFeedback").addEventListener("click",()=>{closeModal();renderCareLibrary();showToast("效果反馈已保存")});
}

function entriesForView() { const source=dataMode==="demo"?demoEntries:localEntries(); const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-(periodDays-1));return source.filter((entry)=>new Date(`${entry.date}T12:00:00`)>=cutoff).sort((a,b)=>new Date(a.date)-new Date(b.date)); }
function renderJourney() {
  const entries=entriesForView();const avg=entries.length?Math.round(entries.reduce((s,e)=>s+e.score,0)/entries.length):0;$("#averageScore").textContent=avg||"—";$("#entryCount").textContent=entries.length;$("#periodLabel").textContent=`最近 ${periodDays} 天`;$("#chartTitle").textContent=`最近 ${periodDays} 天`;
  const moods=countValues(entries.flatMap((e)=>e.moods||[e.mood]));const topMood=topPair(moods);$("#commonMood").textContent=topMood[0];$("#commonMoodMeta").textContent=topMood[1]?`${topMood[1]} 次出现`:"等待记录";
  const triggers=countValues(entries.flatMap((e)=>e.triggers||[]));const topTrigger=topPair(triggers);$("#commonTrigger").textContent=topTrigger[0].replace("负荷","");$("#commonTriggerMeta").textContent=topTrigger[1]?`${topTrigger[1]} 次出现`:"等待记录";
  $("#dataNotice").innerHTML=dataMode==="demo"?"<strong>演示数据</strong>仅用于展示，与你的记录严格分开。":entries.length?`当前展示当前设备中的 <strong>${entries.length} 条个人记录</strong>。`:"还没有个人记录，返回“今天”开始第一次觉察。";
  $("#clearEntries").hidden=dataMode!=="mine";$("#exportEntries").hidden=dataMode!=="mine";renderWeeklyBrief(entries,triggers);renderChart(entries);renderEvidence(entries);renderBars(triggers,entries.length);renderBodySummary(entries);renderHistory(entries.slice().reverse());
}
function renderWeeklyBrief(entries,triggers) {
  const count=entries.length; const confidence=count>=7?"较高":count>=3?"中等":"探索中"; $("#reviewConfidence").textContent=confidence; $("#reviewSample").textContent=`${count} 条记录`;
  if(!count){reviewEvidenceIds=[];$("#reviewTitle").textContent="记录积累后，这里会总结变化而不是给你贴标签。";$("#reviewBody").textContent="趋势结论会标注样本量、置信度和证据来源。";return}
  const top=topPair(triggers);reviewEvidenceIds=entries.filter((entry)=>(entry.triggers||[]).includes(top[0])).map((entry)=>entry.id);
  if(count===1){$("#reviewTitle").textContent="刚开始积累，不判断上升或下降";$("#reviewBody").textContent=`当前只有 1 条记录${top[1]?`，包含“${top[0]}”线索`:""}。至少需要 3 条记录才会生成方向性总结。`;return}
  const split=Math.max(1,Math.floor(count/2));const early=entries.slice(0,split);const late=entries.slice(split);const avg=(items)=>items.length?items.reduce((sum,e)=>sum+e.score,0)/items.length:0;const delta=Math.round(avg(late)-avg(early));const direction=Math.abs(delta)<5?"整体状态较为平稳":delta>0?`后半段状态比前半段高 ${delta} 分`:`后半段状态比前半段低 ${Math.abs(delta)} 分`;
  $("#reviewTitle").textContent=direction; $("#reviewBody").textContent=`${top[1]?`“${top[0]}”出现 ${top[1]} 次，是本周期最常见线索。`:"暂未发现重复线索。"} 这是基于 ${count} 条记录的关联总结，不代表因果或诊断。`;
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
function strategyStatus(logs){const better=logs.filter((log)=>log.result==="better").length;const rate=logs.length?Math.round(better/logs.length*100):0;if(logs.length>=3&&rate>=67)return {label:"已验证",className:"verified"};if(logs.length>=2&&rate>=50)return {label:"初步有效",className:"promising"};if(logs.length>=2&&rate<=33)return {label:"可能不适合",className:"unsuitable"};return {label:"待验证",className:"pending"}}
function renderStrategyMap() {
  const personal=practiceLogs();const logs=personal.length?personal:demoPracticeLogs;const filtered=logs.filter((log)=>(strategyMood==="all"||(log.moods||[]).includes(strategyMood))&&(strategyScene==="all"||log.scene===strategyScene));
  const groups=Object.keys(careCatalog).map((type)=>{const items=filtered.filter((log)=>log.type===type);const better=items.filter((log)=>log.result==="better").length;const delta=items.reduce((sum,log)=>sum+(log.before-log.after),0);return {type,items,better,rate:items.length?Math.round(better/items.length*100):0,delta,status:strategyStatus(items)}}).sort((a,b)=>b.rate-a.rate||b.items.length-a.items.length);
  const supported=groups.filter((group)=>group.items.length);const best=supported[0];$("#strategyHeadline").textContent=best?`“${careCatalog[best.type].label}”在当前筛选下证据更积极。`:"当前筛选下还没有个人反馈证据。";$("#strategyBody").textContent=best?`基于 ${best.items.length} 次尝试，其中 ${best.better} 次改善，平均每次变化 ${(best.delta/best.items.length).toFixed(1)} 级。${personal.length?"这是你的个人数据。":"当前为演示数据，与个人记录隔离。"}`:"换一个情绪或场景，或继续完成带反馈的练习。";
  $("#strategyMap").innerHTML=groups.map((group)=>{const c=careCatalog[group.type];return `<article class="strategy-card ${group.status.className}"><div><span class="strategy-icon">${c.icon}</span><em>${group.status.label}</em></div><h3>${c.label}</h3><strong>${group.items.length?group.rate+"%":"—"}</strong><p>${group.items.length?`${group.better}/${group.items.length} 次改善 · 累计变化 ${group.delta} 级`:"尚无符合筛选条件的证据"}</p><button class="text-button" data-strategy-care="${group.type}">${group.items.length?"查看证据":"了解方法"} →</button></article>`}).join("");
  $$('[data-strategy-care]').forEach((button)=>button.addEventListener("click",()=>showStrategyEvidence(button.dataset.strategyCare,filtered)));
}
function showStrategyEvidence(type,logs){const items=logs.filter((log)=>log.type===type);const c=careCatalog[type];openModal(`<p class="step-label">策略证据 · ${c.label}</p><h2 id="modalTitle">${items.length?`${items.length} 条可追溯反馈`:"还没有符合条件的个人证据"}</h2><p>${c.description}</p>${items.length?`<div class="practice-steps">${items.map((log)=>`<div>${formatDate(log.date)} · ${escapeHtml((log.moods||[]).join(" · "))} · ${escapeHtml(log.scene||"未填写")} · ${log.before}/5 → ${log.after}/5</div>`).join("")}</div>`:"<p>从“今天”完成一次记录和练习反馈，或在“实验”中收集结果。</p>"}`)}
function aggregateLogs(logs){return logs.reduce((source,log)=>{source[log.type]=source[log.type]||{better:0,same:0,worse:0,totalDelta:0};source[log.type][log.result]++;source[log.type].totalDelta+=log.before-log.after;return source},{})}
function renderCareLibrary(){const feedback=careFeedback();const logs=practiceLogs();const hasPersonal=Object.keys(feedback).length>0||logs.length>0;const source=logs.length?aggregateLogs(logs):Object.keys(feedback).length?feedback:demoFeedback;const ordered=Object.keys(careCatalog).sort((a,b)=>statsFor(b,source).rate-statsFor(a,source).rate);renderStrategyMap();$("#careScoreGrid").innerHTML=ordered.map((key)=>{const c=careCatalog[key],s=statsFor(key,source);return `<article class="care-score-card"><div class="top"><span class="icon">${c.icon}</span><span class="status">${hasPersonal?"我的数据":"演示数据"}</span></div><h3>${c.label}</h3><strong>${s.attempts?s.rate+"%":"—"}</strong><small>${s.attempts?`${s.better}/${s.attempts} 次反馈变好`:"尚未尝试"}</small><div class="mini-track"><i style="width:${s.rate}%"></i></div></article>`}).join("");const best=ordered[0],bestStats=statsFor(best,source);$("#learningTitle").textContent=hasPersonal&&bestStats.attempts?`“${careCatalog[best].label}”目前更适合你。`:"当前展示示例效果，完成练习后将切换为你的结果。";$("#learningBody").textContent=hasPersonal&&bestStats.attempts?`根据 ${bestStats.attempts} 次尝试中的 ${bestStats.better} 次改善反馈生成；相似情绪或场景证据会额外影响下一次排序。`:"效果排序来自练习前后的强度变化，不根据流行度推荐。";$("#libraryGrid").innerHTML=Object.entries(careCatalog).map(([key,c])=>`<article class="library-item"><span>${c.duration} 分钟</span><h3>${c.label}</h3><p>${c.description}</p><button class="text-button" data-library-care="${key}">了解练习 →</button></article>`).join("");$$('[data-library-care]').forEach((button)=>button.addEventListener("click",()=>{const c=careCatalog[button.dataset.libraryCare];openModal(`<p class="step-label">关怀练习</p><h2 id="modalTitle">${c.label}</h2><p>${c.description}</p><p>为了正确比较效果，请从“今天”的记录结果进入练习，心屿会保留练习前的强度作为基线。</p><button class="primary-button compact" id="goRecord">去记录此刻</button>`);$("#goRecord").addEventListener("click",()=>{closeModal();switchPage("today")})}))}

function openQuickRelief(){openModal(`<p class="step-label">无需记录 · 不进入分析</p><h2 id="modalTitle">先让这一分钟轻一点</h2><p>如果你现在不想描述发生了什么，可以直接选择一个低负担动作。它不会被算作“有效反馈”。</p><div class="quick-relief-grid"><button data-quick-care="breath"><strong>30 秒呼气</strong><small>适合心跳快、脑子停不下来</small></button><button data-quick-care="ground"><strong>五感着陆</strong><small>适合反复想同一件事</small></button><button data-quick-care="stretch"><strong>放松肩颈</strong><small>适合久坐和身体紧绷</small></button><button data-quick-care="pause"><strong>什么都不做</strong><small>先给自己 20 秒空白</small></button></div>`);$$('[data-quick-care]').forEach((button)=>button.addEventListener("click",()=>renderQuickRelief(button.dataset.quickCare)))}
function renderQuickRelief(type){const content={breath:["慢慢呼气","吸气 4 秒，呼气 6 秒，只做三轮。"],ground:["回到此刻","说出眼前 3 个物体、听见的 2 种声音、身体接触的 1 个位置。"],stretch:["松开肩颈","把肩膀抬向耳朵，停 3 秒，再随呼气慢慢放下。"],pause:["允许空白","把手机放低，什么都不解决，只陪自己坐 20 秒。"]}[type];openModal(`<p class="step-label">即时缓解</p><h2 id="modalTitle">${content[0]}</h2><p>${content[1]}</p><div class="breathing-orb"><span>慢一点</span></div><button class="primary-button compact" id="finishRelief">先到这里</button>`);$("#finishRelief").addEventListener("click",()=>{closeModal();showToast("已完成一次即时缓解，不计入效果学习")})}
function openProductTour(){openModal(`<p class="step-label">面试官建议路径 · 约 60 秒</p><h2 id="modalTitle">看见系统如何验证“什么对我有效”</h2><div class="tour-steps"><div><b>1</b><span>一键填入完整记录，生成四层可解释洞察</span></div><div><b>2</b><span>查看由记录生成的七日关怀微实验</span></div><div><b>3</b><span>载入与个人数据隔离的三次实验反馈</span></div><div><b>4</b><span>在策略地图查看情绪×场景×方法的证据状态</span></div></div><div class="modal-actions"><button id="startTour">从记录开始</button><button id="tourResult">直接看七日成果</button></div>`);$("#startTour").addEventListener("click",()=>{closeModal();switchPage("today");fillDemo();showToast("第 1 步：生成本次洞察")});$("#tourResult").addEventListener("click",()=>{closeModal();showExperimentDemo()})}
function openSafety(){analysisTimers.forEach(clearTimeout);$("#analysisState").hidden=true;$("#insightResult").hidden=true;$("#insightEmpty").hidden=false;$("#insightCard").classList.add("empty");$("#insightMeta").textContent="已停止普通分析";lockCare();openModal(`<div><p class="step-label">你的安全最重要</p><h2 id="modalTitle">现在请不要独自承受</h2><p>我注意到你写下了可能与人身安全有关的内容。心屿会停止普通建议，这个工具不能替代即时帮助。</p><div class="safety-box">请立刻联系一位你信任的人并告诉对方你现在的情况。如果存在立即危险，请联系当地紧急服务或前往最近的急诊机构，并尽量不要独处。</div><div class="modal-actions"><button id="ackSafety">我会联系他人</button><button id="backSafety">返回记录</button></div></div>`);$("#ackSafety").addEventListener("click",()=>{closeModal();showToast("请优先联系可信任的人，并待在安全环境中")});$("#backSafety").addEventListener("click",closeModal)}
function cycleCare(){if(!currentEntryId)return;const entry=localEntries().find((e)=>e.id===currentEntryId);if(!entry)return;recommendedOrder.push(recommendedOrder.shift());displayCareOrder(entry);showToast("已更换首选方案")}
function rateInsight(rate){localStorage.setItem("xinyu-last-insight-rate",rate);showToast(rate==="yes"?"谢谢确认，这条理解已被标记为贴近":"已降低这类判断的可信度")}
function rateEvidence(){openModal(`<p class="step-label">校准趋势判断</p><h2 id="modalTitle">这个发现符合你的感受吗？</h2><p>记录中的同时出现不一定代表原因，你的反馈能帮助系统保持克制。</p><div class="modal-actions"><button data-rate="yes">比较准确</button><button data-rate="no">不太准确</button></div>`);$$('[data-rate]').forEach((button)=>button.addEventListener("click",()=>{closeModal();showToast("已记录你的校准意见")}))}
function exportEntries(){const entries=localEntries();if(!entries.length&&!currentPlan()&&!currentExperiment()&&!practiceLogs().length&&!readJSON(DRAFT_KEY,null)&&!Object.keys(careFeedback()).length&&!localStorage.getItem("xinyu-last-insight-rate")){showToast("还没有可导出的个人数据");return}const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),entries,careFeedback:careFeedback(),practiceLogs:practiceLogs(),carePlan:currentPlan(),experiment:currentExperiment(),draft:readJSON(DRAFT_KEY,null),insightRating:localStorage.getItem("xinyu-last-insight-rate")},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`xinyu-records-${todayString()}.json`;a.click();URL.revokeObjectURL(url);showToast("个人记录已导出")}

function fillDemo(){selectedMoods=["疲惫","焦虑"];$$("#moodOptions button").forEach((b)=>b.classList.toggle("selected",selectedMoods.includes(b.dataset.mood)));$("#intensity").value=4;$("#intensityValue").textContent="4 / 5";$("#journalText").value="今天连续开了几场会，回到家还是忍不住想着没完成的工作。";$("#charCount").textContent=`${$("#journalText").value.length} / 360`;$$("#triggerOptions button").forEach((b)=>b.classList.toggle("selected",["工作负荷","睡眠不足"].includes(b.dataset.value)));setRecordMode("full");$$("#bodyOptions button").forEach((b)=>b.classList.toggle("selected",["肩颈紧绷","身体疲惫"].includes(b.dataset.value)));$("#scene").value="家里";$("#availableTime").value="3";currentEntryId=null;markDirty();$("#recordCard").scrollIntoView({behavior:"smooth",block:"start"});showToast("已填入演示场景，现在可以生成洞察")}

function init(){restoreDraft();$("#streakNumber").textContent=new Set(localEntries().map((e)=>e.date)).size;$$(".nav-item").forEach((b)=>b.addEventListener("click",()=>switchPage(b.dataset.page)));$$('[data-page-link]').forEach((b)=>b.addEventListener("click",()=>switchPage(b.dataset.pageLink)));$$("[data-record-mode]").forEach((b)=>b.addEventListener("click",()=>setRecordMode(b.dataset.recordMode)));$$("#moodOptions button").forEach((b)=>b.addEventListener("click",()=>chooseMood(b)));$("#intensity").addEventListener("input",(e)=>{$("#intensityValue").textContent=`${e.target.value} / 5`;markDirty()});$("#journalText").addEventListener("input",(e)=>{$("#charCount").textContent=`${e.target.value.length} / 360`;markDirty()});$("#showQuickPhrases").addEventListener("click",()=>$("#quickPhrases").hidden=!$("#quickPhrases").hidden);$$("#quickPhrases button").forEach((b)=>b.addEventListener("click",()=>{$("#journalText").value=b.textContent;$("#charCount").textContent=`${b.textContent.length} / 360`;$("#quickPhrases").hidden=true;markDirty()}));$$("#triggerOptions button").forEach((b)=>b.addEventListener("click",()=>selectTag(b,"#triggerOptions")));$$("#bodyOptions button").forEach((b)=>b.addEventListener("click",()=>selectTag(b,"#bodyOptions")));$("#scene").addEventListener("change",markDirty);$("#availableTime").addEventListener("change",markDirty);$("#analyzeButton").addEventListener("click",analyzeEntry);$("#quickDemo").addEventListener("click",fillDemo);$("#quickRelief").addEventListener("click",openQuickRelief);$("#viewDemo").addEventListener("click",openProductTour);$("#aboutTour").addEventListener("click",openProductTour);$("#createExperiment").addEventListener("click",createExperimentFromLatest);$("#showDemoExperiment").addEventListener("click",showExperimentDemo);$("#experimentCheckin").addEventListener("click",openExperimentCheckin);$("#pauseExperiment").addEventListener("click",toggleExperimentPause);$("#finishExperiment").addEventListener("click",finishExperimentEarly);$("#dismissGuide").addEventListener("click",()=>$("#flowGuide").hidden=true);$("#swapCare").addEventListener("click",cycleCare);$("#skipCare").addEventListener("click",()=>showToast("可以，暂时不做也是一种选择"));$$('[data-insight-rate]').forEach((b)=>b.addEventListener("click",()=>rateInsight(b.dataset.insightRate)));
  $("#strategyMood").addEventListener("change",(e)=>{strategyMood=e.target.value;renderStrategyMap()});$("#strategyScene").addEventListener("change",(e)=>{strategyScene=e.target.value;renderStrategyMap()});$$("#dataMode button").forEach((b)=>b.addEventListener("click",()=>{dataMode=b.dataset.value;$$("#dataMode button").forEach((x)=>x.classList.toggle("active",x===b));renderJourney()}));$$("#periodMode button").forEach((b)=>b.addEventListener("click",()=>{periodDays=Number(b.dataset.value);$$("#periodMode button").forEach((x)=>x.classList.toggle("active",x===b));renderJourney()}));$("#showEvidence").addEventListener("click",()=>highlightEntries(evidenceIds));$("#reviewAction").addEventListener("click",()=>reviewEvidenceIds.length?highlightEntries(reviewEvidenceIds):showToast("当前还没有可定位的周度证据"));$("#rateEvidence").addEventListener("click",rateEvidence);$("#refreshPlan").addEventListener("click",()=>{const plan=currentPlan();if(plan&&Date.now()-new Date(plan.createdAt).getTime()>86400000){switchPage("today");showToast("旧计划已结束，请记录此刻后重新生成");return}const latest=localEntries().sort((a,b)=>new Date(b.createdAt||b.date)-new Date(a.createdAt||a.date))[0];if(latest){createCarePlan(latest,true);showToast("已根据当前数据刷新计划")}else{switchPage("today");showToast("先完成一条记录，再生成你的计划")}});$("#planFeedback").addEventListener("click",openPlanFeedback);$("#exportEntries").addEventListener("click",exportEntries);$("#clearEntries").addEventListener("click",()=>{const hasData=localEntries().length||currentPlan()||currentExperiment()||practiceLogs().length||readJSON(DRAFT_KEY,null)||Object.keys(careFeedback()).length||localStorage.getItem("xinyu-last-insight-rate");if(!hasData){showToast("没有需要清除的个人数据");return}if(confirm("确认清除当前设备上的全部个人数据吗？记录、草稿、计划、实验与反馈都无法恢复。")){[ENTRY_KEY,LEGACY_ENTRY_KEY,PLAN_KEY,EXPERIMENT_KEY,PRACTICE_LOG_KEY,FEEDBACK_KEY,DRAFT_KEY,"xinyu-last-insight-rate"].forEach((key)=>localStorage.removeItem(key));experimentMode="personal";currentEntryId=null;renderJourney();renderPlan();renderExperiment();renderCareLibrary();showToast("全部个人数据已清除")}});
  $("#closeModal").addEventListener("click",closeModal);$("#modal").addEventListener("click",(e)=>{if(e.target===e.currentTarget)closeModal()});const privacy=$("#privacyModal");const closePrivacy=()=>{privacy.classList.remove("open");privacy.setAttribute("aria-hidden","true")};$("#privacyButton").addEventListener("click",()=>{privacy.classList.add("open");privacy.setAttribute("aria-hidden","false")});$("#closePrivacy").addEventListener("click",closePrivacy);$("#understandPrivacy").addEventListener("click",closePrivacy);privacy.addEventListener("click",(e)=>{if(e.target===e.currentTarget)closePrivacy()});document.addEventListener("keydown",(e)=>{if(e.key==="Escape"){closeModal();closePrivacy()}});lockCare();renderCareLibrary();renderPlan();renderExperiment();}
init();
