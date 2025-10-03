// === 全域狀態 ===
let currentDate = new Date();
let currentWeekStart = getWeekStart(new Date());

// 番茄鐘狀態
let sessions = [];
let currentSession = null;
let timer = 25 * 60;
let isActive = false;
let isBreak = false;
let interval = null;

// 預設習慣
const defaultHabits = [
  { id: 1, name: '準時起床', icon: '🌅' },
  { id: 2, name: '運動 30 分鐘', icon: '🏃‍♂️' },
  { id: 3, name: '喝足夠的水', icon: '💧' },
  { id: 4, name: '閱讀或學習', icon: '📚' },
  { id: 5, name: '準時睡覺', icon: '😴' },
  { id: 6, name: '冥想或放鬆', icon: '🧘‍♀️' }
];

// === 初始化 ===
document.addEventListener("DOMContentLoaded", () => {
  initializePomodoro();
  initializeDailyTracker();
  initializeWeeklyReview();
  loadGoals();

  // 如果有自訂時間，帶入
  const customWork = parseInt(localStorage.getItem("customWork")) || 25;
  const customBreak = parseInt(localStorage.getItem("customBreak")) || 5;
  document.getElementById("work-time").value = customWork;
  document.getElementById("break-time").value = customBreak;
  timer = customWork * 60;
});

// === 工具函式 ===
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function showNotification(message) {
  const n = document.getElementById("notification");
  n.textContent = message;
  n.classList.add("show");
  setTimeout(() => n.classList.remove("show"), 3000);
}

// === 智能提醒 ===
const encouragements = ["太棒了！繼續保持🔥","💪 你正在進步","👏 很棒的堅持","🌟 成就+1","🚀 前進一小步"];
function randomEncouragement() {
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

// === 成就系統 ===
function checkAchievements(habitId) {
  let totalCount = 0;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("habits_")) {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (data[habitId]?.completed) totalCount++;
    }
  });
  if (totalCount === 7) showNotification("🏅 獲得徽章：連續完成7天！");
  if (totalCount === 30) showNotification("🎖️ 獲得徽章：30次堅持達成！");
}

// === Tab 切換 ===
function switchTab(tabName) {
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add("active");

  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  document.getElementById(`${tabName}-tab`).classList.add("active");

  if (tabName === "daily") {
    updateCurrentDate();
    loadDailyData();
  } else if (tabName === "weekly") {
    updateWeekRange();
    loadWeeklyData();
  } else if (tabName === "monthly") {
    loadMonthlyReport();
  } else if (tabName === "goals") {
    loadGoals();
  }
}

// === 番茄鐘 ===
function initializePomodoro() {
  document.getElementById("start-btn").addEventListener("click", startTimer);
  document.getElementById("pause-btn").addEventListener("click", pauseTimer);
  document.getElementById("reset-btn").addEventListener("click", resetTimer);
  document.getElementById("add-btn").addEventListener("click", addTask);
  document.getElementById("task-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
  updatePomodoroDisplay();
}

function setCustomTime(){
  const work = parseInt(document.getElementById("work-time").value) || 25;
  const rest = parseInt(document.getElementById("break-time").value) || 5;
  localStorage.setItem("customWork", work);
  localStorage.setItem("customBreak", rest);
  timer = work * 60;
  isBreak = false;
  resetTimer();
  showNotification(`✅ 已設定工作 ${work} 分鐘 / 休息 ${rest} 分鐘`);
}

function startTimer() {
  if (!currentSession) return;
  isActive = true;
  document.getElementById("start-btn").disabled = true;
  document.getElementById("pause-btn").disabled = false;
  if (!currentSession.startTime) currentSession.startTime = new Date().toLocaleTimeString();
  interval = setInterval(() => {
    timer--;
    updatePomodoroDisplay();
    if (timer === 0) handleTimerComplete();
  }, 1000);
}
function pauseTimer() {
  isActive = false;
  clearInterval(interval);
  document.getElementById("start-btn").disabled = false;
  document.getElementById("pause-btn").disabled = true;
}
function resetTimer() {
  isActive = false;
  isBreak = false;
  const customWork = parseInt(localStorage.getItem("customWork")) || 25;
  timer = customWork * 60;
  currentSession = null;
  document.getElementById("start-btn").disabled = true;
  document.getElementById("pause-btn").disabled = true;
  document.getElementById("current-task").style.display = "none";
  clearInterval(interval);
  updatePomodoroDisplay();
}
function handleTimerComplete() {
  isActive = false;
  clearInterval(interval);
  if (!isBreak) {
    currentSession.endTime = new Date().toLocaleTimeString();
    currentSession.completed = true;
    updateTaskDisplay();
    showNotification("🎉 工作時間完成！開始休息");
    isBreak = true;
    const rest = parseInt(localStorage.getItem("customBreak") || "5");
    timer = rest * 60;
    startTimer();
  } else {
    showNotification("⏰ 休息結束！準備開始下一個番茄鐘");
    resetTimer();
  }
}

// === 任務：標籤 + 優先級 ===
const priorityLevels = ["最低","低","中","高","最高"];
function addTask() {
  const text = document.getElementById("task-input").value.trim();
  if (!text) return;
  const tag = prompt("輸入任務標籤 (可留空):") || "";
  const priority = prompt("輸入優先級 (1最低 ~ 5最高):","3");
  const newTask = {
    id: Date.now(),
    task: text,
    tag: tag,
    priority: parseInt(priority),
    startTime: '',
    endTime: '',
    completed: false,
    notes: '',
    date: new Date().toLocaleDateString()
  };
  sessions.push(newTask);
  document.getElementById("task-input").value = "";
  updateTaskDisplay();
}
function updateTaskDisplay() {
  const taskList = document.getElementById("task-list");
  if (sessions.length === 0) {
    taskList.innerHTML = '<div style="text-align:center;padding:60px;color:#666;">還沒有任務</div>';
    return;
  }
  taskList.innerHTML = sessions.map(s => `
    <div style="border:2px solid ${currentSession?.id===s.id?'#007bff':'#e0e0e0'};border-radius:15px;padding:15px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${s.task}</strong> <span style="color:#888;">[${s.tag||'無標籤'}]</span>
          <span style="color:${s.priority>=4?'red':'#666'};">優先級:${priorityLevels[s.priority-1]}</span>
        </div>
        <button onclick="deleteTask(${s.id})" style="background:#dc3545;color:#fff;border:none;padding:5px 10px;border-radius:5px;">🗑️</button>
      </div>
    </div>
  `).join('');
}
function deleteTask(id) {
  sessions = sessions.filter(s => s.id !== id);
  updateTaskDisplay();
}

// === 每日追蹤 ===
function initializeDailyTracker(){ updateCurrentDate(); loadDailyData(); }
function updateCurrentDate(){
  const dateElement = document.getElementById("current-date");
  if(dateElement){
    dateElement.textContent = currentDate.toLocaleDateString("zh-TW", {
      year:'numeric', month:'long', day:'numeric', weekday:'long'
    });
  }
  const picker = document.getElementById("date-picker");
  if(picker){
    picker.value = currentDate.toISOString().split("T")[0];
  }
}
function changeDate(days){ currentDate.setDate(currentDate.getDate()+days); updateCurrentDate(); loadDailyData(); }
function jumpToDate(val){
  currentDate = new Date(val);
  updateCurrentDate();
  loadDailyData();
}
function getAllHabits(){ return [...defaultHabits, ...(JSON.parse(localStorage.getItem("customHabits")||"[]"))]; }
function loadDailyData(){
  const dateKey=currentDate.toDateString();
  const habitData=JSON.parse(localStorage.getItem(`habits_${dateKey}`)||'{}');
  const grid=document.getElementById("habits-grid");
  grid.innerHTML=getAllHabits().map(h=>`
    <div class="habit-card">
      <div class="habit-header">
        <div class="habit-name">${h.icon} ${h.name}</div>
        <div class="habit-checkbox ${habitData[h.id]?.completed?'checked':''}" onclick="toggleHabit(${h.id})">
          ${habitData[h.id]?.completed?'✓':''}
        </div>
      </div>
      <textarea class="habit-notes" onchange="updateHabitNotes(${h.id},this.value)">${habitData[h.id]?.notes||''}</textarea>
    </div>
  `).join('');
}
function toggleHabit(habitId){
  const dateKey=currentDate.toDateString();
  const habitData=JSON.parse(localStorage.getItem(`habits_${dateKey}`)||'{}');
  if(!habitData[habitId]) habitData[habitId]={};
  habitData[habitId].completed=!habitData[habitId].completed;
  localStorage.setItem(`habits_${dateKey}`,JSON.stringify(habitData));
  loadDailyData();
  if(habitData[habitId].completed){
    const habit=getAllHabits().find(h=>h.id===habitId);
    showNotification(`🎉 完成習慣：${habit.name}｜${randomEncouragement()}`);
    checkAchievements(habitId);
  }
}
function updateHabitNotes(habitId,notes){
  const dateKey=currentDate.toDateString();
  const habitData=JSON.parse(localStorage.getItem(`habits_${dateKey}`)||'{}');
  if(!habitData[habitId]) habitData[habitId]={};
  habitData[habitId].notes=notes;
  localStorage.setItem(`habits_${dateKey}`,JSON.stringify(habitData));
}
function saveDailyData(){ showNotification("💾 今日記錄已保存！"); }

// === 週間反思 (簡化) ===
function initializeWeeklyReview(){ updateWeekRange(); loadWeeklyData(); }
function updateWeekRange(){
  const weekEnd=new Date(currentWeekStart); weekEnd.setDate(weekEnd.getDate()+6);
  document.getElementById("week-range").textContent=`${currentWeekStart.toLocaleDateString('zh-TW')} - ${weekEnd.toLocaleDateString('zh-TW')}`;
}
function loadWeeklyData(){ loadProgressOverview(); }
function loadProgressOverview(){
  const weekDates=[...Array(7)].map((_,i)=>new Date(currentWeekStart.getTime()+i*86400000));
  const allHabits=getAllHabits(); let total=0,done=0,days=0;
  weekDates.forEach(d=>{
    const data=JSON.parse(localStorage.getItem(`habits_${d.toDateString()}`)||'{}');
    let dailyDone=0;
    allHabits.forEach(h=>{ total++; if(data[h.id]?.completed){done++;dailyDone++;} });
    if(dailyDone>0) days++;
  });
  const rate=total>0?Math.round((done/total)*100):0;
  document.getElementById("progress-overview").innerHTML=`
    <div class="progress-card"><div class="progress-number">${done}</div><div class="progress-label">已完成習慣</div></div>
    <div class="progress-card"><div class="progress-number">${days}</div><div class="progress-label">活躍天數</div></div>
    <div class="progress-card"><div class="progress-number">${rate}%</div><div class="progress-label">完成率</div></div>`;
}

// === 月度報告 ===
function loadMonthlyReport(){
  const ctx=document.getElementById("monthlyChart").getContext("2d");
  let days=[],values=[];
  for(let i=1;i<=30;i++){
    const d=new Date(); d.setDate(i);
    days.push(i+"日");
    const data=JSON.parse(localStorage.getItem(`habits_${d.toDateString()}`)||'{}');
    values.push(Object.values(data).filter(h=>h.completed).length);
  }
  new Chart(ctx,{type:"bar",data:{labels:days,datasets:[{label:"每日完成習慣數",data:values,backgroundColor:"#667eea"}]},options:{responsive:true}});
}

// === 目標管理 ===
function addGoal(){
  const input=document.getElementById("goal-input"), target=document.getElementById("goal-target");
  if(!input.value||!target.value) return alert("請輸入完整目標與次數");
  const goals=JSON.parse(localStorage.getItem("goals")||"[]");
  goals.push({id:Date.now(),name:input.value,target:parseInt(target.value),progress:0});
  localStorage.setItem("goals",JSON.stringify(goals));
  input.value=""; target.value=""; loadGoals();
}
function loadGoals(){
  const goals=JSON.parse(localStorage.getItem("goals")||"[]");
  document.getElementById("goal-list").innerHTML=goals.map(g=>`
    <div style="margin-bottom:10px;padding:10px;border:1px solid #ccc;border-radius:8px;">
      <strong>${g.name}</strong> (${g.progress}/${g.target})
      <button onclick="updateGoal(${g.id})">+1</button>
    </div>`).join("");
}
function updateGoal(id){
  const goals=JSON.parse(localStorage.getItem("goals")||"[]");
  const g=goals.find(x=>x.id===id);
  if(g){ g.progress++; if(g.progress>=g.target) showNotification("🎯 完成長期目標："+g.name); }
  localStorage.setItem("goals",JSON.stringify(goals));
  loadGoals();
}

// === 深色模式 ===
function toggleDarkMode(){ document.body.classList.toggle("dark-mode"); }
