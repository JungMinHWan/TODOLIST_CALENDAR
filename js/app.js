let currentPeriod = 'today', selectedDate = null, currentMetricsDate = null;
let touchStartX = 0, touchEndX = 0;

let calDisplayDate = new Date();
let memoDatesSet = new Set();

const THEMES = {
  0: { primary: '#d32f2f', dark: '#b71c1c', light: '#ffcdd2', header: 'linear-gradient(135deg, #ef5350 0%, #d32f2f 100%)' },
  1: { primary: '#FF8F00', dark: '#FF6F00', light: '#FFECB3', header: 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)' },
  2: { primary: '#ff5722', dark: '#e64a19', light: '#ffccbc', header: 'linear-gradient(135deg, #ff7043 0%, #ff5722 100%)' },
  3: { primary: '#2979ff', dark: '#1565c0', light: '#e3f2fd', header: 'linear-gradient(135deg, #448aff 0%, #2979ff 100%)' },
  4: { primary: '#2E7D32', dark: '#1B5E20', light: '#C8E6C9', header: 'linear-gradient(135deg, #43A047 0%, #1B5E20 100%)' },
  5: { primary: '#FFD700', dark: '#FFA000', light: '#FFF8E1', header: 'linear-gradient(135deg, #FDD835 0%, #F57F17 40%, #FFF59D 70%, #FBC02D 100%)' },
  6: { primary: '#5d4037', dark: '#3e2723', light: '#d7ccc8', header: 'linear-gradient(135deg, #6d4c41 0%, #4e342e 100%)' }
};

function applyThemeByDate(dateStr) {
  if(!dateStr) return;
  const dayIndex = new Date(dateStr).getDay();
  const theme = THEMES[dayIndex];
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-dark', theme.dark);
  root.style.setProperty('--theme-light-bg', theme.light);
  root.style.setProperty('--theme-header-bg', theme.header);
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateKorean(dateStr) {
  const d = new Date(dateStr);
  const w = ['일','월','화','수','목','금','토'];
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${w[d.getDay()]})`;
}

function formatDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

document.addEventListener('DOMContentLoaded', function() {
  currentMetricsDate = getTodayString();
  document.getElementById('inputDueDate').value = currentMetricsDate;
  applyThemeByDate(currentMetricsDate);
  
  fetchMemoDates(); 
  refreshAllData();
  
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  }, {passive: true});
  
  document.getElementById('searchToggleBtn').onclick = () => toggleHeader('search');
  document.getElementById('memoToggleBtn').onclick = () => toggleHeader('memo');
  document.getElementById('calendarBtn').onclick = () => {
    toggleHeader('calendar');
    renderCalendar();
  };
  
  document.getElementById('prevMonthBtn').onclick = () => { calDisplayDate.setMonth(calDisplayDate.getMonth()-1); renderCalendar(); };
  document.getElementById('nextMonthBtn').onclick = () => { calDisplayDate.setMonth(calDisplayDate.getMonth()+1); renderCalendar(); };
  
  document.getElementById('searchBtn').onclick = executeSearch;
  document.getElementById('searchInput').onkeypress = (e) => { if(e.key === 'Enter') executeSearch(); };
  document.getElementById('saveMemoBtn').onclick = saveMemo;
  
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.onclick = function() {
      closeAllHeaders();
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('calendarBtn').classList.remove('active');
      document.getElementById('selectedDateLabel').style.display = 'none';
      this.classList.add('active');
      
      currentPeriod = this.dataset.period;
      
      const d = new Date();
      if(currentPeriod === 'yesterday') d.setDate(d.getDate()-1);
      else if(currentPeriod === 'tomorrow') d.setDate(d.getDate()+1);
      currentMetricsDate = formatDateString(d);
      
      if(currentPeriod === 'yesterday' || currentPeriod === 'tomorrow') {
        selectedDate = currentMetricsDate;
      } else {
        selectedDate = null;
      }
      
      document.getElementById('inputDueDate').value = currentMetricsDate;
      applyThemeByDate(currentMetricsDate);
      refreshAllData();
    };
  });
  
  document.getElementById('btnSaveMetrics').onclick = saveMetrics;
  document.getElementById('btnAdd').onclick = addTask;
  document.getElementById('inputDescription').onkeypress = (e) => { if(e.key === 'Enter') addTask(); };
});

async function fetchMemoDates() {
  const dates = await api.getAllMemoDates();
  memoDatesSet = new Set(dates);
  renderCalendar();
}

function renderCalendar() {
  const year = calDisplayDate.getFullYear();
  const month = calDisplayDate.getMonth();
  document.getElementById('calTitle').innerText = `${year}년 ${month + 1}월`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const grid = document.getElementById('calDaysGrid');
  grid.innerHTML = '';
  
  for(let i=0; i<startDayOfWeek; i++) {
    const div = document.createElement('div');
    div.className = 'cal-day empty';
    grid.appendChild(div);
  }
  
  const todayStr = getTodayString();
  for(let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'cal-day';
    div.innerText = d;
    
    if(memoDatesSet.has(dateStr)) {
      div.classList.add('has-memo');
      const dot = document.createElement('div');
      dot.className = 'cal-dot';
      div.appendChild(dot);
    }
    
    if(dateStr === todayStr) div.classList.add('today');
    if(dateStr === currentMetricsDate) div.classList.add('selected');
    
    div.onclick = () => {
      selectDateFromCalendar(dateStr);
    };
    
    grid.appendChild(div);
  }
}

function selectDateFromCalendar(dateStr) {
  selectedDate = dateStr;
  currentPeriod = 'custom';
  currentMetricsDate = dateStr;
  
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('calendarBtn').classList.add('active');
  
  document.getElementById('selectedDateLabel').textContent = formatDateKorean(dateStr);
  document.getElementById('selectedDateLabel').style.display = 'inline-block';
  
  applyThemeByDate(dateStr);
  updateUIForCustomDate();
  refreshAllData();
  
  document.getElementById('customCalendarWrapper').classList.remove('show');
}

function toggleHeader(type) {
  const map = { 'search': 'searchWrapper', 'memo': 'memoWrapper', 'calendar': 'customCalendarWrapper' };
  const btnMap = { 'search': 'searchToggleBtn', 'memo': 'memoToggleBtn', 'calendar': 'calendarBtn' };
  
  for(let k in map) {
    if(k !== type) {
      document.getElementById(map[k]).classList.remove('show');
      if(k !== 'calendar') document.getElementById(btnMap[k]).classList.remove('active');
    }
  }
  
  const el = document.getElementById(map[type]);
  const btn = document.getElementById(btnMap[type]);
  el.classList.toggle('show');
  if(type !== 'calendar') btn.classList.toggle('active');
  
  if(el.classList.contains('show')) {
    if(type === 'search') document.getElementById('searchInput').focus();
    if(type === 'memo') document.getElementById('memoInput').focus();
  }
}

function closeAllHeaders() {
  ['searchWrapper','memoWrapper','customCalendarWrapper'].forEach(id => document.getElementById(id).classList.remove('show'));
  ['searchToggleBtn','memoToggleBtn'].forEach(id => document.getElementById(id).classList.remove('active'));
}

function updateUIForCustomDate() {
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('calendarBtn').classList.add('active');
  const label = document.getElementById('selectedDateLabel');
  label.textContent = formatDateKorean(currentMetricsDate);
  label.style.display = 'inline-block';
}

function handleSwipeGesture() {
  if(document.getElementById('searchWrapper').classList.contains('show') || 
     document.getElementById('memoWrapper').classList.contains('show') ||
     document.getElementById('customCalendarWrapper').classList.contains('show')) return;
  
  if(touchEndX > touchStartX + 50) changeDate(-1);
  else if(touchEndX < touchStartX - 50) changeDate(1);
}

function changeDate(offset) {
  const d = new Date(currentMetricsDate);
  d.setDate(d.getDate() + offset);
  const newDateStr = formatDateString(d);
  selectDateFromCalendar(newDateStr);
}

async function refreshAllData() {
  document.getElementById('metricsDate').textContent = formatDateKorean(currentMetricsDate);
  document.getElementById('inputDueDate').value = currentMetricsDate;
  
  const m = await api.getDailyMetrics(currentMetricsDate);
  if(m) {
    document.getElementById('contractsCount').value = m.contracts_count;
    document.getElementById('dbCount').value = m.db_count;
    document.getElementById('saturdayVisitors').value = m.saturday_visitors;
    document.getElementById('sundayVisitors').value = m.sunday_visitors;
  }
  
  const memo = document.getElementById('memoInput');
  memo.value = ''; memo.placeholder = '로딩 중...';
  
  const r = await api.getDailyMemo(currentMetricsDate);
  const content = r.content || '';
  memo.value = content;
  memo.placeholder = `${formatDateKorean(currentMetricsDate)} 메모...`;
  updateMemoBadge(content);
  
  loadTasks();
}

function updateMemoBadge(content) {
  const badge = document.getElementById('memoBadge');
  if(content && content.trim().length > 0) badge.style.display = 'flex';
  else badge.style.display = 'none';
}

async function loadTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const tid = setTimeout(() => {
    if(list.innerHTML.includes('spinner')) list.innerHTML = '<div class="empty-state"><p>응답 없음</p></div>';
  }, 8000);
  
  let tasks;
  if(selectedDate) {
    tasks = await api.getTasksByDate(selectedDate);
  } else {
    tasks = await api.getTasksByPeriod(currentPeriod);
  }
  
  clearTimeout(tid);
  if(!tasks || tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>할일 없음</p></div>';
    return;
  }
  renderTasks(tasks);
}

function renderTasks(tasks) {
  const list = document.getElementById('taskList');
  list.innerHTML = tasks.map(t => {
    const checked = t.status === '완료' ? 'checked' : '';
    const compClass = t.status === '완료' ? 'completed' : '';
    const dateStr = new Date(t.created_at).getMonth()+1 + '/' + new Date(t.created_at).getDate();
    
    return `<div class="task-item ${compClass}" data-id="${t.task_id}">
      <div class="task-checkbox ${checked}" onclick="toggleStatus('${t.task_id}', '${t.status==='완료'?'진행중':'완료'}')"></div>
      <div class="task-content">
        <div class="task-description ${compClass}">${escapeHtml(t.description)}</div>
        <div class="task-meta"><span>${dateStr}</span><span class="status-badge ${t.status}">${t.status}</span></div>
      </div>
      <div class="task-actions">
        <button class="task-edit" onclick="editTask('${t.task_id}')">✎</button>
        <button class="task-delete" onclick="deleteTask('${t.task_id}')">×</button>
      </div>
    </div>`;
  }).join('');
}

async function executeSearch() {
  const kw = document.getElementById('searchInput').value.trim();
  if(!kw) return;
  const list = document.getElementById('taskList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  closeAllHeaders();
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  
  const tasks = await api.searchTasks(kw);
  if(!tasks || tasks.length === 0) list.innerHTML = `<div class="empty-state"><p>'${kw}' 결과 없음</p></div>`;
  else renderTasks(tasks);
}

async function saveMetrics() {
  const btn = document.getElementById('btnSaveMetrics');
  const st = document.getElementById('saveStatus');
  btn.disabled = true; btn.innerText = '...';
  
  const val = {
    contracts_count: document.getElementById('contractsCount').value,
    db_count: document.getElementById('dbCount').value,
    saturday_visitors: document.getElementById('saturdayVisitors').value,
    sunday_visitors: document.getElementById('sundayVisitors').value
  };
  
  const res = await api.saveDailyMetrics(currentMetricsDate, val);
  if(res.success) {
    btn.disabled = false; btn.innerText = '저장'; st.innerText = 'V';
    setTimeout(() => st.innerText = '', 2000);
  } else {
    btn.disabled = false; btn.innerText = '저장'; 
    alert('저장에 실패했습니다.');
  }
}

async function saveMemo() {
  const btn = document.getElementById('saveMemoBtn');
  const content = document.getElementById('memoInput').value;
  
  btn.disabled = true; btn.innerText = '...';
  
  const res = await api.saveDailyMemo(currentMetricsDate, content);
  if(res.success) {
    btn.disabled = false; btn.innerText = '메모 저장';
    const st = document.getElementById('memoStatus'); st.innerText = '완료';
    updateMemoBadge(content);
    fetchMemoDates();
    setTimeout(() => st.innerText = '', 2000);
  } else {
    btn.disabled = false; btn.innerText = '메모 저장';
    alert('저장에 실패했습니다.');
  }
}

async function addTask() {
  const desc = document.getElementById('inputDescription');
  const date = document.getElementById('inputDueDate');
  if(!desc.value.trim()) return;
  
  document.getElementById('btnAdd').disabled = true;
  
  const res = await api.addTaskWithDate(desc.value, date.value, selectedDate || getTodayString());
  if(res.success) {
    desc.value = ''; 
    document.getElementById('btnAdd').disabled = false;
    loadTasks();
  } else {
    document.getElementById('btnAdd').disabled = false;
    alert('추가에 실패했습니다.');
  }
}

async function toggleStatus(id, st) { 
  const res = await api.updateTaskStatus(id, st);
  if(res.success) loadTasks();
}

async function editTask(id) {
  const t = document.querySelector(`.task-item[data-id="${id}"] .task-description`).innerText;
  const n = prompt('수정:', t);
  if(n && n.trim() !== t) {
    const res = await api.updateTaskContent(id, n.trim());
    if(res.success) loadTasks();
  }
}

async function deleteTask(id) { 
  if(confirm('삭제?')) {
    const res = await api.deleteTask(id);
    if(res.success) loadTasks();
  }
}

function escapeHtml(t) { 
  const d = document.createElement('div'); 
  d.textContent = t; 
  return d.innerHTML; 
}
