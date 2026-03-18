/* ================================================
   POMOPET — app.js  |  Full Application Logic
   ================================================ */

// ===================== STATE =====================
let state = {
  // Auth
  currentUser: null,

  // Session config
  focusMinutes: 25,
  breakMinutes: 5,
  totalMinutes: 120,
  showOverall: true,
  slots: [],          // [{id, focusSecs, breakSecs, tasks:[], status:'pending'|'focus'|'break'|'done'}]
  currentSlotIndex: 0,
  sessionActive: false,
  isPaused: false,
  isFocusPhase: true,

  // Timers
  slotSecondsLeft: 0,
  overallSecondsLeft: 0,
  timerInterval: null,
  focusTotalSecs: 0,
  focusElapsedSecs: 0,  // for tamagotchi growth (counts focus time only)

  // Tamagotchi
  selectedPet: null,   // 'plant' | 'fish'
  petName: '',
  petGrowth: 0,        // 0–100
  petState: 'normal',  // 'normal' | 'damaged' | 'glowing'
  savedPets: [],

  // Todo list
  todos: [],           // [{id, name, due, priority, status, slotAssignment}]
  selectedTodoIds: [],
  todoFilter: 'all',
  todoSort: 'due',

  // Background
  bgColour: '#0a0a0a',

  // Incomplete task prompt queue
  incompleteQueue: [],
};

// ===================== PERSISTENCE =====================
function saveToStorage() {
  const key = state.currentUser ? `pomopet_${state.currentUser.email}` : 'pomopet_guest';
  const data = {
    todos: state.todos,
    savedPets: state.savedPets,
    petGrowth: state.petGrowth,
    petName: state.petName,
    selectedPet: state.selectedPet,
    bgColour: state.bgColour,
  };
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage() {
  const key = state.currentUser ? `pomopet_${state.currentUser.email}` : 'pomopet_guest';
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.todos       = data.todos      || [];
    state.savedPets   = data.savedPets  || [];
    state.petGrowth   = data.petGrowth  || 0;
    state.petName     = data.petName    || '';
    state.selectedPet = data.selectedPet|| null;
    state.bgColour    = data.bgColour   || '#0a0a0a';
  } catch(e) {}
}

// Auth users stored separately
function getUsers() {
  return JSON.parse(localStorage.getItem('pomopet_users') || '{}');
}
function saveUsers(users) {
  localStorage.setItem('pomopet_users', JSON.stringify(users));
}

// ===================== AUTH =====================
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`#tab-${tab}`).classList.add('active');
  event.target.classList.add('active');
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  if (!email || !pass) { err.textContent = '▸ Fill in all fields!'; return; }
  const users = getUsers();
  if (!users[email] || users[email].password !== btoa(pass)) {
    err.textContent = '▸ Invalid email or password'; return;
  }
  err.textContent = '';
  state.currentUser = { email, name: users[email].name };
  loadFromStorage();
  goToSetup();
}

function handleRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-password').value;
  const err   = document.getElementById('reg-error');
  if (!name || !email || !pass) { err.textContent = '▸ Fill in all fields!'; return; }
  if (pass.length < 6) { err.textContent = '▸ Password min 6 chars'; return; }
  const users = getUsers();
  if (users[email]) { err.textContent = '▸ Email already registered'; return; }
  users[email] = { name, password: btoa(pass) };
  saveUsers(users);
  err.textContent = '';
  state.currentUser = { email, name };
  loadFromStorage();
  goToSetup();
}

function guestMode() {
  state.currentUser = null;
  loadFromStorage();
  goToSetup();
}

function handleLogout() {
  saveToStorage();
  state.currentUser = null;
  state.sessionActive = false;
  clearInterval(state.timerInterval);
  showScreen('screen-auth');
}

// ===================== NAVIGATION =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToSetup() {
  document.getElementById('display-trainer-name').textContent =
    state.currentUser ? state.currentUser.name.toUpperCase() : 'GUEST';
  document.body.style.background = state.bgColour;
  generateSlots();
  populateSetupTasks();
  // If pet already chosen, skip pet choice
  if (state.selectedPet) {
    document.getElementById('pet-choice-area').classList.add('hidden');
    document.getElementById('pet-name-section').classList.remove('hidden');
    document.getElementById('pet-name-input').value = state.petName;
    document.querySelector(`[data-pet="${state.selectedPet}"]`)?.classList.add('selected');
  }
  showScreen('screen-setup');
}

function goBack() {
  if (state.sessionActive) {
    showScreen('screen-main');
  } else {
    showScreen('screen-setup');
  }
}

// ===================== SETUP =====================
function generateSlots() {
  const focus   = parseInt(document.getElementById('focus-time').value) || 25;
  const brk     = parseInt(document.getElementById('break-time').value) || 5;
  const total   = parseInt(document.getElementById('total-time').value) || 120;
  const slotLen = focus + brk;
  const count   = Math.max(1, Math.floor(total / slotLen));

  state.focusMinutes = focus;
  state.breakMinutes = brk;
  state.totalMinutes = total;

  state.slots = Array.from({length: count}, (_, i) => ({
    id: i + 1,
    focusSecs: focus * 60,
    breakSecs: brk * 60,
    tasks: [],
    status: 'pending',
  }));

  renderSlotAssignment();
}

function renderSlotAssignment() {
  const container = document.getElementById('slot-task-assignment');
  const unassigned = state.todos.filter(t => t.slotAssignment === null || t.slotAssignment === undefined);
  const assigned   = state.todos.filter(t => t.slotAssignment !== null && t.slotAssignment !== undefined);

  if (state.todos.length === 0) {
    container.innerHTML = `<p class="hint-text">No tasks yet — add them in the To-Do page!</p>`;
    return;
  }

  let html = '';

  // Overall row
  html += `<div class="slot-assign-item">
    <span class="slot-assign-label">OVERALL</span>
    <div class="slot-task-chips" id="chips-overall">`;
  state.todos.forEach(t => {
    const cls = t.slotAssignment === 'overall' ? 'overall' : '';
    html += `<span class="task-chip ${cls}" onclick="assignTask('${t.id}','overall')">${t.name}</span>`;
  });
  html += `</div></div>`;

  // Each slot row
  state.slots.forEach((slot, i) => {
    html += `<div class="slot-assign-item">
      <span class="slot-assign-label">SLOT ${i+1}</span>
      <div class="slot-task-chips" id="chips-slot-${i+1}">`;
    state.todos.forEach(t => {
      const cls = t.slotAssignment === slot.id ? 'assigned' : '';
      html += `<span class="task-chip ${cls}" onclick="assignTask('${t.id}',${slot.id})">${t.name}</span>`;
    });
    html += `</div></div>`;
  });

  container.innerHTML = html;
}

function assignTask(taskId, target) {
  const task = state.todos.find(t => t.id === taskId);
  if (!task) return;
  task.slotAssignment = target;
  renderSlotAssignment();
  saveToStorage();
}

function selectPet(type) {
  if (state.selectedPet && state.petGrowth < 100 && state.petGrowth > 0) {
    alert('Cannot change pet until current pet is fully grown!');
    return;
  }
  state.selectedPet = type;
  document.querySelectorAll('.pet-option').forEach(p => p.classList.remove('selected'));
  document.querySelector(`[data-pet="${type}"]`).classList.add('selected');
  document.getElementById('pet-name-section').classList.remove('hidden');
}

function populateSetupTasks() {
  // ensure todos have slotAssignment field
  state.todos.forEach(t => {
    if (t.slotAssignment === undefined) t.slotAssignment = null;
  });
  renderSlotAssignment();
}

function startSession() {
  const nameInput = document.getElementById('pet-name-input').value.trim();
  if (!state.selectedPet) { alert('Choose your pet first!'); return; }
  if (!nameInput && !state.petName) { alert('Name your pet first!'); return; }
  if (nameInput) state.petName = nameInput.toUpperCase();

  state.showOverall = document.getElementById('show-overall').checked;

  // Assign tasks to slots
  state.slots.forEach(slot => {
    slot.tasks = state.todos.filter(t => t.slotAssignment === slot.id).map(t => ({...t}));
  });

  // Overall tasks (no specific slot)
  const overallTasks = state.todos.filter(t => t.slotAssignment === 'overall').map(t => ({...t}));
  if (overallTasks.length > 0 && state.slots.length > 0) {
    state.slots[0].tasks.push(...overallTasks);
  }

  state.currentSlotIndex = 0;
  state.isFocusPhase     = true;
  state.isPaused         = false;
  state.sessionActive    = true;
  state.focusElapsedSecs = 0;
  state.overallSecondsLeft = state.totalMinutes * 60;
  state.slotSecondsLeft    = state.slots[0].focusSecs;
  state.focusTotalSecs     = state.slots[0].focusSecs;

  state.slots[0].status = 'focus';

  renderMainScreen();
  showScreen('screen-main');
  startTimer();
  saveToStorage();
}

// ===================== TIMER =====================
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tick, 1000);
}

function tick() {
  if (state.isPaused) return;

  state.slotSecondsLeft--;
  if (state.showOverall && state.isFocusPhase) state.overallSecondsLeft--;

  // Track focus time for tamagotchi
  if (state.isFocusPhase) {
    state.focusElapsedSecs++;
    // every 30 min of focus = 25% growth
    const growthPerSec = 25 / (30 * 60);
    state.petGrowth = Math.min(100, state.petGrowth + growthPerSec);
  }

  updateTimerUI();

  if (state.slotSecondsLeft <= 0) {
    onPhaseEnd();
  }
}

function onPhaseEnd() {
  const slot = state.slots[state.currentSlotIndex];

  if (state.isFocusPhase) {
    // Focus ended — check incomplete tasks
    const incomplete = slot.tasks.filter(t => !t.completed);
    if (incomplete.length > 0) {
      state.incompleteQueue = [...incomplete];
      showIncompletePrompt();
    } else {
      // All done! glow
      setPetState('glowing');
      setTimeout(() => setPetState('normal'), 5000);
    }
    // Switch to break
    state.isFocusPhase    = false;
    slot.status           = 'break';
    state.slotSecondsLeft = slot.breakSecs;
    state.focusTotalSecs  = slot.breakSecs;
    updateTimerModeUI();
  } else {
    // Break ended — move to next slot
    slot.status = 'done';
    state.currentSlotIndex++;

    if (state.currentSlotIndex >= state.slots.length) {
      onSessionEnd();
      return;
    }

    const nextSlot = state.slots[state.currentSlotIndex];
    nextSlot.status        = 'focus';
    state.isFocusPhase     = true;
    state.slotSecondsLeft  = nextSlot.focusSecs;
    state.focusTotalSecs   = nextSlot.focusSecs;
    updateTimerModeUI();

    // Check if pet fully grown
    if (state.petGrowth >= 100) {
      onPetFullyGrown();
    }
  }
  renderSlotsOverview();
  renderCurrentSlotTasks();
  updateTimerUI();
}

function onSessionEnd() {
  clearInterval(state.timerInterval);
  state.sessionActive = false;
  const display = document.getElementById('main-timer');
  display.textContent = 'DONE!';
  document.getElementById('tama-status').textContent = 'SESSION COMPLETE!';
  if (state.petGrowth >= 100) onPetFullyGrown();
  saveToStorage();
}

function togglePause() {
  state.isPaused = !state.isPaused;
  const btn = document.getElementById('btn-pause-resume');
  btn.textContent = state.isPaused ? '▶ RESUME' : '⏸ PAUSE';
  document.getElementById('main-timer').classList.toggle('paused', state.isPaused);
}

function confirmStop() {
  if (confirm('Stop the current session? Progress will be saved.')) {
    clearInterval(state.timerInterval);
    state.sessionActive = false;
    saveToStorage();
    goToSetup();
  }
}

// ===================== MAIN SCREEN UI =====================
function renderMainScreen() {
  document.getElementById('display-trainer-name').textContent =
    state.currentUser ? state.currentUser.name.toUpperCase() : 'GUEST';
  document.getElementById('tama-name-display').textContent = state.petName;

  updateTimerUI();
  updateTimerModeUI();
  renderSlotsOverview();
  renderCurrentSlotTasks();
  updateTamaUI();

  const overallRow = document.getElementById('overall-timer-row');
  overallRow.style.display = state.showOverall ? 'flex' : 'none';

  renderSavedPets();
}

function updateTimerUI() {
  document.getElementById('main-timer').textContent = formatTime(state.slotSecondsLeft);
  document.getElementById('overall-timer').textContent = formatTime(state.overallSecondsLeft);
  document.getElementById('slot-badge').textContent =
    `SLOT ${state.currentSlotIndex + 1} / ${state.slots.length}`;

  const pct = state.focusTotalSecs > 0
    ? ((state.focusTotalSecs - state.slotSecondsLeft) / state.focusTotalSecs) * 100
    : 0;
  const bar = document.getElementById('timer-bar');
  bar.style.width = `${pct}%`;
  bar.className   = 'timer-bar' + (state.isFocusPhase ? '' : ' break-bar');

  // Tamagotchi growth
  const pctEl = document.getElementById('tama-growth-pct');
  const fill  = document.getElementById('tama-growth-fill');
  const growthPct = Math.round(state.petGrowth);
  pctEl.textContent  = `${growthPct}%`;
  fill.style.width   = `${state.petGrowth}%`;
}

function updateTimerModeUI() {
  const label = document.getElementById('timer-mode-label');
  const timer = document.getElementById('main-timer');
  label.textContent = state.isFocusPhase ? 'FOCUS' : 'BREAK ☕';
  timer.className   = 'timer-display' + (state.isFocusPhase ? '' : ' break-mode');
}

function renderSlotsOverview() {
  const list = document.getElementById('slots-overview-list');
  list.innerHTML = state.slots.map((slot, i) => {
    const isActive = i === state.currentSlotIndex;
    const isDone   = slot.status === 'done';
    let cls = 'slot-row';
    if (isActive) cls += ' active-slot';
    if (isDone)   cls += ' done-slot';

    const taskHtml = slot.tasks.map(t => {
      let tcls = 'slot-task-mini';
      if (t.completed) tcls += ' done-task';
      else if (isActive) tcls += ' active-task';
      return `<div class="${tcls}">▸ ${t.name}</div>`;
    }).join('');

    return `<div class="${cls}">
      <div class="slot-header">
        <span class="slot-number">SLOT ${i+1}</span>
        <span class="slot-time-label">${slot.focusSecs/60}m / ${slot.breakSecs/60}m</span>
      </div>
      <div class="slot-tasks-mini">${taskHtml || '<span class="slot-task-mini">No tasks</span>'}</div>
    </div>`;
  }).join('');
}

function renderCurrentSlotTasks() {
  const ul   = document.getElementById('current-slot-tasks');
  const slot = state.slots[state.currentSlotIndex];
  if (!slot) { ul.innerHTML = ''; return; }

  const allTasks = state.slots.flatMap((s, i) =>
    s.tasks.map(t => ({...t, slotIdx: i}))
  );

  ul.innerHTML = allTasks.map(task => {
    const isCurrent = task.slotIdx === state.currentSlotIndex;
    let cls = 'slot-task-item';
    if (!isCurrent) cls += ' other-slot';
    if (task.completed) cls += ' completed';
    const tick = task.completed ? '✅' : '⬜';
    return `<li class="${cls}" onclick="toggleTaskComplete('${task.id}')">
      <span class="tick">${tick}</span>
      <span>${task.name}</span>
    </li>`;
  }).join('');
}

function toggleTaskComplete(taskId) {
  // Find in current slot
  let found = false;
  state.slots.forEach(slot => {
    const task = slot.tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      task.completed = true;
      found = true;
      // Update master todo
      const masterTask = state.todos.find(t => t.id === taskId);
      if (masterTask) masterTask.status = 'complete';
      triggerConfetti();
      // Check if all current slot tasks done
      const slot2 = state.slots[state.currentSlotIndex];
      if (slot2 && slot2.tasks.every(t => t.completed)) {
        setPetState('glowing');
        setTimeout(() => setPetState('normal'), 4000);
      }
    }
  });
  renderCurrentSlotTasks();
  renderSlotsOverview();
  saveToStorage();
}

// ===================== TAMAGOTCHI =====================
const PET_STAGES = {
  plant: ['🌱', '🪴', '🌿', '🌳'],
  fish:  ['🥚', '🐟', '🐠', '🐡'],
};

function updateTamaUI() {
  const sprite = document.getElementById('tama-sprite');
  const stages = PET_STAGES[state.selectedPet] || PET_STAGES.plant;
  const stageIdx = Math.min(3, Math.floor(state.petGrowth / 25));
  sprite.textContent = stages[stageIdx];

  sprite.className = 'tama-sprite';
  const aura = document.getElementById('tama-aura');
  aura.className = 'tama-aura';

  if (state.petState === 'damaged') {
    sprite.classList.add('damaged');
    aura.classList.add('damage-aura');
    document.getElementById('tama-status').textContent = '😟 FEELING SAD...';
  } else if (state.petState === 'glowing') {
    sprite.classList.add('glowing');
    aura.classList.add('glow-aura');
    document.getElementById('tama-status').textContent = '✨ GLOWING!';
  } else {
    document.getElementById('tama-status').textContent = state.petGrowth >= 100 ? '🌟 FULLY GROWN!' : 'GROWING...';
  }
}

function setPetState(newState) {
  state.petState = newState;
  updateTamaUI();
  if (newState === 'damaged') saveToStorage();
}

function onPetFullyGrown() {
  state.savedPets.push({ type: state.selectedPet, name: state.petName, emoji: PET_STAGES[state.selectedPet][3] });
  state.petGrowth   = 0;
  state.selectedPet = null;
  state.petName     = '';
  saveToStorage();
  renderSavedPets();
  document.getElementById('tama-status').textContent = '🎉 FULLY GROWN! CHOOSE NEXT PET!';
  // Prompt to choose new pet in setup for next slot if there is one
  if (state.currentSlotIndex < state.slots.length - 1) {
    setTimeout(() => alert('🌟 Your pet is fully grown! Choose a new one for the next session!'), 500);
  }
}

function renderSavedPets() {
  const row = document.getElementById('saved-pets-row');
  row.innerHTML = state.savedPets.map((p, i) =>
    `<div class="saved-pet-bubble" title="${p.name}" draggable="true" id="spet-${i}">${p.emoji}</div>`
  ).join('');
}

// ===================== INCOMPLETE TASK PROMPT =====================
function showIncompletePrompt() {
  if (state.incompleteQueue.length === 0) return;
  const task = state.incompleteQueue[0];
  const msg  = document.getElementById('incomplete-task-msg');
  const opts = document.getElementById('incomplete-task-options');

  msg.textContent = `"${task.name}" not done. What now?`;

  // Build shift options for future slots
  const futureSlots = state.slots.slice(state.currentSlotIndex + 1);
  let html = '';
  futureSlots.forEach((slot, i) => {
    const slotNum = state.currentSlotIndex + 2 + i;
    html += `<button class="pixel-btn secondary" onclick="shiftTask('${task.id}', ${slot.id})">▶ MOVE TO SLOT ${slotNum}</button>`;
  });
  html += `<button class="pixel-btn secondary" onclick="extendSession('${task.id}')">⏱ EXTEND OVERALL TIME</button>`;
  html += `<button class="pixel-btn danger" onclick="skipTask('${task.id}')">✕ SKIP TASK</button>`;
  opts.innerHTML = html;

  openModal('modal-incomplete-task');
}

function shiftTask(taskId, targetSlotId) {
  // Remove from current slot
  state.slots.forEach(slot => {
    slot.tasks = slot.tasks.filter(t => t.id !== taskId);
  });
  // Add to target slot
  const targetSlot = state.slots.find(s => s.id === targetSlotId);
  const masterTask  = state.todos.find(t => t.id === taskId);
  if (targetSlot && masterTask) {
    targetSlot.tasks.push({...masterTask});
    masterTask.slotAssignment = targetSlotId;
  }
  closeModal('modal-incomplete-task');
  nextInIncompleteQueue();
  renderCurrentSlotTasks();
  renderSlotsOverview();
  saveToStorage();
}

function extendSession(taskId) {
  const extraMins = parseInt(prompt('Add how many minutes?', '30')) || 30;
  state.overallSecondsLeft += extraMins * 60;
  state.totalMinutes += extraMins;
  // Add a new slot at the end
  const lastSlot = state.slots[state.slots.length - 1];
  const newSlot  = {
    id: state.slots.length + 1,
    focusSecs: state.focusMinutes * 60,
    breakSecs: state.breakMinutes * 60,
    tasks: [],
    status: 'pending',
  };
  const masterTask = state.todos.find(t => t.id === taskId);
  if (masterTask) newSlot.tasks.push({...masterTask});
  state.slots.push(newSlot);
  // Remove from current
  state.slots.forEach(slot => { if(slot.id !== newSlot.id) slot.tasks = slot.tasks.filter(t => t.id !== taskId); });
  closeModal('modal-incomplete-task');
  nextInIncompleteQueue();
  renderSlotsOverview();
  renderCurrentSlotTasks();
  saveToStorage();
}

function skipTask(taskId) {
  const masterTask = state.todos.find(t => t.id === taskId);
  if (masterTask) masterTask.status = 'skipped';
  // Add to skipped list UI
  const skippedList = document.getElementById('skipped-list');
  const li = document.createElement('li');
  li.textContent = masterTask ? masterTask.name : taskId;
  skippedList.appendChild(li);
  // Remove from all slots
  state.slots.forEach(slot => { slot.tasks = slot.tasks.filter(t => t.id !== taskId); });
  setPetState('damaged');
  setTimeout(() => setPetState('normal'), 6000);
  closeModal('modal-incomplete-task');
  nextInIncompleteQueue();
  renderCurrentSlotTasks();
  saveToStorage();
}

function nextInIncompleteQueue() {
  state.incompleteQueue.shift();
  if (state.incompleteQueue.length > 0) {
    showIncompletePrompt();
  }
}

// ===================== TODO LIST =====================
function openTodoPage() {
  if (state.sessionActive) {
    renderTodoOverlay();
    openModal('todo-overlay');
  } else {
    renderTodoPage();
    showScreen('screen-todo');
  }
}

function openTodoOverlay() {
  openTodoPage();
}

function renderTodoPage() {
  const container = document.getElementById('todo-list-container');
  let tasks = [...state.todos];

  // Filter
  if (state.todoFilter !== 'all') {
    tasks = tasks.filter(t => t.status === state.todoFilter);
  }

  // Sort
  if (state.todoSort === 'due') {
    tasks.sort((a,b) => (a.due||'9999') < (b.due||'9999') ? -1 : 1);
  } else if (state.todoSort === 'priority') {
    const p = { high:0, medium:1, low:2 };
    tasks.sort((a,b) => (p[a.priority]||1) - (p[b.priority]||1));
  } else if (state.todoSort === 'status') {
    const s = { 'not-started':0, 'in-progress':1, 'complete':2, 'skipped':3 };
    tasks.sort((a,b) => (s[a.status]||0) - (s[b.status]||0));
  }

  if (tasks.length === 0) {
    container.innerHTML = `<div class="pixel-card"><p class="hint-text">No tasks yet! Hit + ADD to create one.</p></div>`;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const isSelected = state.selectedTodoIds.includes(task.id);
    const isDone     = task.status === 'complete';
    return `<div class="todo-task-card ${isSelected ? 'selected' : ''}" onclick="toggleTodoSelect('${task.id}')">
      <div class="todo-task-check">
        <span style="font-size:16px">${isDone ? '✅' : '⬜'}</span>
      </div>
      <div class="todo-task-body">
        <div class="todo-task-name ${isDone ? 'done' : ''}">${task.name}</div>
        <div class="todo-task-meta">
          <span class="priority-badge ${task.priority}">${task.priority.toUpperCase()}</span>
          <span class="status-badge ${task.status}">${formatStatus(task.status)}</span>
          ${task.due ? `<span class="due-date-label">📅 ${task.due}</span>` : ''}
        </div>
      </div>
      <div class="todo-task-actions">
        <button class="pixel-btn tiny secondary" onclick="event.stopPropagation(); openEditStatus('${task.id}')">STATUS</button>
        <button class="pixel-btn tiny danger" onclick="event.stopPropagation(); deleteTask('${task.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderTodoOverlay() {
  const list = document.getElementById('todo-overlay-list');
  const slotOptions = state.slots.map((s,i) =>
    `<option value="${s.id}">SLOT ${i+1}</option>`
  ).join('');

  list.innerHTML = state.todos.filter(t => t.status !== 'complete').map(task => {
    const isSelected = state.selectedTodoIds.includes(task.id);
    return `<div class="overlay-task-item ${isSelected ? 'selected' : ''}" onclick="toggleTodoSelect('${task.id}')">
      <span style="font-size:14px">${isSelected ? '☑' : '☐'}</span>
      <span class="overlay-task-name">${task.name}</span>
      <select class="overlay-target-select" id="overlay-target-${task.id}" onclick="event.stopPropagation()">
        <option value="overall">OVERALL</option>
        ${slotOptions}
      </select>
    </div>`;
  }).join('') || '<p class="hint-text">No pending tasks!</p>';
}

function addOverlayTasksToSession() {
  state.selectedTodoIds.forEach(id => {
    const select = document.getElementById(`overlay-target-${id}`);
    if (!select) return;
    const target  = select.value;
    const task    = state.todos.find(t => t.id === id);
    if (!task) return;
    task.slotAssignment = target === 'overall' ? 'overall' : parseInt(target);
    // Add to slot
    if (target !== 'overall') {
      const slot = state.slots.find(s => s.id === parseInt(target));
      if (slot && !slot.tasks.find(t => t.id === id)) slot.tasks.push({...task});
    } else if (state.slots[state.currentSlotIndex]) {
      const slot = state.slots[state.currentSlotIndex];
      if (!slot.tasks.find(t => t.id === id)) slot.tasks.push({...task});
    }
  });
  state.selectedTodoIds = [];
  closeModal('todo-overlay');
  renderCurrentSlotTasks();
  renderSlotsOverview();
  saveToStorage();
}

function toggleTodoSelect(id) {
  const idx = state.selectedTodoIds.indexOf(id);
  if (idx === -1) state.selectedTodoIds.push(id);
  else state.selectedTodoIds.splice(idx, 1);
  if (document.getElementById('screen-todo').classList.contains('active')) {
    renderTodoPage();
  } else {
    renderTodoOverlay();
  }
}

function moveSelectedToMain() {
  if (state.selectedTodoIds.length === 0) { alert('Select tasks first!'); return; }
  goToSetup();
}

function sortTodo(by) { state.todoSort = by; renderTodoPage(); }
function filterTodo(f) {
  state.todoFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(b => b.classList.remove('active-filter'));
  document.getElementById(`filter-${f}`)?.classList.add('active-filter');
  renderTodoPage();
}

function openAddTask() {
  document.getElementById('task-name-input').value = '';
  document.getElementById('task-due-input').value  = '';
  document.getElementById('task-priority-input').value = 'medium';
  openModal('modal-add-task');
}

function saveTask() {
  const name = document.getElementById('task-name-input').value.trim();
  if (!name) { alert('Task needs a name!'); return; }
  const task = {
    id: 'task_' + Date.now(),
    name,
    due:      document.getElementById('task-due-input').value,
    priority: document.getElementById('task-priority-input').value,
    status:   'not-started',
    slotAssignment: null,
    completed: false,
  };
  state.todos.push(task);
  closeModal('modal-add-task');
  renderTodoPage();
  saveToStorage();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  state.todos = state.todos.filter(t => t.id !== id);
  state.slots.forEach(slot => { slot.tasks = slot.tasks.filter(t => t.id !== id); });
  renderTodoPage();
  saveToStorage();
}

function openEditStatus(id) {
  const task = state.todos.find(t => t.id === id);
  if (!task) return;
  const statuses = ['not-started','in-progress','complete','skipped'];
  const choice = prompt(`Change status for "${task.name}"\nOptions: ${statuses.join(', ')}`, task.status);
  if (choice && statuses.includes(choice)) {
    task.status = choice;
    if (choice === 'complete') task.completed = true;
    renderTodoPage();
    saveToStorage();
  }
}

// ===================== SETTINGS =====================
function openSettings() { openModal('modal-settings'); }

function setBg(colour) {
  state.bgColour = colour;
  document.body.style.background = colour;
  document.querySelectorAll('.bg-swatch').forEach(s => {
    s.classList.toggle('active-swatch', s.dataset.colour === colour);
  });
  saveToStorage();
}

// ===================== CONFETTI =====================
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({length: 80}, () => ({
    x:     Math.random() * canvas.width,
    y:     -10,
    r:     Math.random() * 6 + 3,
    d:     Math.random() * 2 + 1,
    colour: ['#88cc00','#c8e07a','#00ccaa','#ddaa00','#cc2200'][Math.floor(Math.random()*5)],
    tilt:  Math.random() * 10 - 5,
    tiltA: 0,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.colour;
      ctx.moveTo(p.x + p.tilt, p.y);
      ctx.lineTo(p.x, p.y + p.tilt + p.r/2);
      ctx.stroke();
      p.y       += p.d + 1;
      p.tiltA   += 0.1;
      p.tilt     = Math.sin(p.tiltA) * 12;
    });
    frame++;
    if (frame < 120) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

// ===================== MODAL HELPERS =====================
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===================== UTILS =====================
function formatTime(secs) {
  if (secs < 0) secs = 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n) { return String(n).padStart(2,'0'); }

function formatStatus(s) {
  const map = { 'not-started':'NOT STARTED', 'in-progress':'IN PROGRESS', 'complete':'COMPLETE', 'skipped':'SKIPPED' };
  return map[s] || s.toUpperCase();
}

// ===================== BOOT =====================
window.addEventListener('DOMContentLoaded', () => {
  // Wire up todo page link (top bar icon uses openTodoOverlay)
  // Initial screen
  showScreen('screen-auth');

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && state.sessionActive) {
      e.preventDefault();
      togglePause();
    }
  });
});
