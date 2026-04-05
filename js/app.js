let calDisplayDate = new Date();
let currentTasks = [];
let memoDatesSet = new Set();
let selectedDate = null; // Currently selected date in modal

const HOLIDAYS = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날', '06-06': '현충일',
  '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '성탄절',
  '2026-02-16': '설날연휴', '2026-02-17': '설날', '2026-02-18': '설날연휴',
  '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일',
  '2026-09-24': '추석연휴', '2026-09-25': '추석', '2026-09-26': '추석연휴'
};
function getHoliday(dateStr) {
  const mmdd = dateStr.substring(5);
  return HOLIDAYS[dateStr] || HOLIDAYS[mmdd] || null;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateKorean(dateStr) {
  const d = new Date(dateStr);
  const w = ['일','월','화','수','목','금','토'];
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${w[d.getDay()]})`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const authOverlay = document.getElementById('authOverlay');
  if (localStorage.getItem('todolist_pass') !== '4806') {
    authOverlay.style.display = 'flex';
    document.getElementById('authBtn').onclick = handleAuth;
    document.getElementById('authInput').onkeypress = (e) => { if(e.key === 'Enter') handleAuth(); };
    setTimeout(() => document.getElementById('authInput').focus(), 100);
    return;
  } else {
    authOverlay.style.display = 'none';
    await initApp();
  }
});

async function handleAuth() {
  const val = document.getElementById('authInput').value;
  if (val === '4806') {
    localStorage.setItem('todolist_pass', '4806');
    document.getElementById('authOverlay').style.display = 'none';
    await initApp();
  } else {
    alert('비밀번호가 틀렸습니다.');
    document.getElementById('authInput').value = '';
    document.getElementById('authInput').focus();
  }
}

async function initApp() {
  // Event listeners
  document.getElementById('prevMonthBtn').onclick = () => { calDisplayDate.setMonth(calDisplayDate.getMonth() - 1); refreshCalendar(); };
  document.getElementById('nextMonthBtn').onclick = () => { calDisplayDate.setMonth(calDisplayDate.getMonth() + 1); refreshCalendar(); };
  
  document.getElementById('monthPicker').onchange = (e) => {
    if(e.target.value) {
      const parts = e.target.value.split('-');
      calDisplayDate.setFullYear(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      refreshCalendar();
    }
  };
  
  document.getElementById('searchToggleBtn').onclick = () => {
    document.getElementById('searchWrapper').classList.toggle('show');
    document.getElementById('searchResultsList').style.display = 'none';
  };
  
  document.getElementById('searchBtn').onclick = executeSearch;
  document.getElementById('searchInput').onkeypress = (e) => { if(e.key === 'Enter') executeSearch(); };

  document.getElementById('closeModalBtn').onclick = closeModal;
  document.getElementById('saveMemoBtn').onclick = saveMemo;
  document.getElementById('btnAdd').onclick = addTask;
  document.getElementById('inputDescription').onkeypress = (e) => { if(e.key === 'Enter') addTask(); };

  // Init
  await fetchMemoDates();
  await refreshCalendar();
}

async function fetchMemoDates() {
  const dates = await api.getAllMemoDates();
  memoDatesSet = new Set(dates);
}

async function refreshCalendar() {
  const year = calDisplayDate.getFullYear();
  const month = calDisplayDate.getMonth();
  document.getElementById('calTitle').innerText = `${year}년 ${month + 1}월`;
  document.getElementById('monthPicker').value = `${year}-${String(month+1).padStart(2,'0')}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Date range for API
  // From 1st day of month 00:00 to 1st day of next month 00:00
  const startIso = new Date(year, month, 1).toISOString();
  const endIso = new Date(year, month + 1, 1).toISOString();
  
  const grid = document.getElementById('calDaysGrid');
  grid.innerHTML = '<div class="loading" style="grid-column: 1 / -1;"><div class="spinner"></div></div>';

  currentTasks = await api.getTasksByDateRange(startIso, endIso);
  renderCalendarDays(year, month, firstDay, lastDay);
}

function renderCalendarDays(year, month, firstDay, lastDay) {
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const textLimit = 3; // Max tasks to show per block

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
    const dayOfWeek = new Date(year, month, d).getDay();
    
    // Filter tasks for this day (need to compare local dates, not UTC ISO strings)
    const dayTasks = currentTasks.filter(t => formatDateString(new Date(t.created_at)) === dateStr);
    
    const div = document.createElement('div');
    div.className = 'cal-day';
    if (dateStr === todayStr) div.classList.add('today');
    
    div.onclick = () => openDayModal(dateStr, dayTasks);

    // Day Number
    const numDiv = document.createElement('div');
    numDiv.className = 'cal-day-num';
    const holidayName = getHoliday(dateStr);
    
    if(dayOfWeek === 0 || holidayName) numDiv.classList.add('sunday');
    else if(dayOfWeek === 6) numDiv.classList.add('saturday');
    
    if(memoDatesSet.has(dateStr)) numDiv.classList.add('has-memo');
    
    numDiv.innerText = d;
    if(holidayName) {
      numDiv.innerHTML += ` <span style="font-size:9px; font-weight:normal;">${holidayName}</span>`;
    }
    div.appendChild(numDiv);

    // Mini tasks
    const count = dayTasks.length;
    for(let i=0; i < Math.min(count, textLimit); i++) {
      const t = dayTasks[i];
      const taskDiv = document.createElement('div');
      taskDiv.className = 'mini-task ' + (t.status === '완료' ? 'completed' : '');
      
      let desc = t.description;
      if (desc.length > 10) desc = desc.substring(0, 10);
      taskDiv.textContent = desc;
      
      div.appendChild(taskDiv);
    }
    
    if(count > textLimit) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-btn';
      moreBtn.innerText = `+ ${count - textLimit}개 더보기`;
      div.appendChild(moreBtn);
    }
    
    grid.appendChild(div);
  }
}

async function openDayModal(dateStr, initialTasks) {
  selectedDate = dateStr;
  document.getElementById('modalDateTitle').innerText = formatDateKorean(dateStr);
  document.getElementById('inputDescription').value = '';
  document.getElementById('modalMemoInput').value = '로딩 중...';
  document.getElementById('modalMemoInput').disabled = true;
  document.getElementById('dayModalOverlay').classList.add('show');
  
  renderModalTasks(initialTasks || []);

  const r = await api.getDailyMemo(dateStr);
  const memoEl = document.getElementById('modalMemoInput');
  memoEl.value = r.content || '';
  memoEl.disabled = false;
  
  // Also refetch tasks in background just in case we need latest
  const s = new Date(dateStr);
  const e = new Date(s.getTime() + 86400000);
  const latestTasks = await api.getTasksByDateRange(s.toISOString(), e.toISOString());
  renderModalTasks(latestTasks);
}

function closeModal() {
  document.getElementById('dayModalOverlay').classList.remove('show');
  selectedDate = null;
}

function renderModalTasks(tasks) {
  const list = document.getElementById('modalTaskList');
  if(!tasks || tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>등록된 할 일이 없습니다.</p></div>';
    return;
  }
  
  list.innerHTML = tasks.map(t => {
    const checked = t.status === '완료' ? 'checked' : '';
    const compClass = t.status === '완료' ? 'completed' : '';
    
    return `<div class="task-item ${compClass}">
      <div class="task-checkbox ${checked}" onclick="toggleStatus('${t.task_id}', '${t.status==='완료'?'진행중':'완료'}')"></div>
      <div class="task-content">
        <div class="task-description ${compClass}">${escapeHtml(t.description)}</div>
      </div>
      <button class="task-delete" onclick="deleteTask('${t.task_id}')">×</button>
    </div>`;
  }).join('');
}

async function reloadModalTasks() {
  if(!selectedDate) return;
  const list = document.getElementById('modalTaskList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const s = new Date(selectedDate);
  const e = new Date(s.getTime() + 86400000);
  const latestTasks = await api.getTasksByDateRange(s.toISOString(), e.toISOString());
  renderModalTasks(latestTasks);
  
  // also refresh main calendar
  refreshCalendar();
}

async function addTask() {
  const desc = document.getElementById('inputDescription');
  if(!desc.value.trim() || !selectedDate) return;
  
  const btn = document.getElementById('btnAdd');
  btn.disabled = true;
  
  const res = await api.addTaskWithDate(desc.value, selectedDate, selectedDate);
  if(res.success) {
    desc.value = ''; 
    await reloadModalTasks();
  } else {
    alert('추가에 실패했습니다.');
  }
  btn.disabled = false;
}

async function toggleStatus(id, newStatus) { 
  const res = await api.updateTaskStatus(id, newStatus);
  if(res.success) await reloadModalTasks();
}

async function deleteTask(id) { 
  if(confirm('이 항목을 삭제하시겠습니까?')) {
    const res = await api.deleteTask(id);
    if(res.success) await reloadModalTasks();
  }
}

async function saveMemo() {
  const btn = document.getElementById('saveMemoBtn');
  const memoEl = document.getElementById('modalMemoInput');
  const st = document.getElementById('memoStatus');
  
  if(!selectedDate) return;
  
  btn.disabled = true; btn.innerText = '...';
  const val = memoEl.value.trim();
  
  const res = await api.saveDailyMemo(selectedDate, val);
  if(res.success) {
    btn.disabled = false; btn.innerText = '저장';
    st.innerText = '완료';
    
    if(val.length > 0) memoDatesSet.add(selectedDate);
    else memoDatesSet.delete(selectedDate);
    refreshCalendar();
    
    setTimeout(() => st.innerText = '', 2000);
  } else {
    btn.disabled = false; btn.innerText = '저장';
    alert('저장에 실패했습니다.');
  }
}

async function executeSearch() {
  const kw = document.getElementById('searchInput').value.trim();
  const list = document.getElementById('searchResultsList');
  if(!kw) {
    list.style.display = 'none';
    return;
  }
  
  list.style.display = 'block';
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const tasks = await api.searchTasks(kw);
  if(!tasks || tasks.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>'${kw}' 검색 결과가 없습니다.</p></div>`;
  } else {
    list.innerHTML = tasks.map(t => {
      const d = formatDateString(new Date(t.created_at));
      return `<div style="padding: 10px; border-bottom: 1px solid #ccc; font-size: 14px; cursor: pointer;" onclick="openDayModal('${d}', null)">
        <strong>${d}</strong> - ${escapeHtml(t.description)}
      </div>`;
    }).join('');
  }
}

function escapeHtml(t) { 
  const d = document.createElement('div'); 
  d.textContent = t; 
  return d.innerHTML; 
}

