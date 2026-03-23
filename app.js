/* ================================================
   POMOGOTCHI — app.js  v5  ✨
   ================================================ */

// ===================== FISH DATABASE =====================
const FISH_DB = [
  { id:'goldfish',            name:'Goldfish',              rarity:'common',     colour:'#ffb347', desc:'A classic! Always happy to see you.' },
  { id:'molly',               name:'Molly',                 rarity:'common',     colour:'#c8a87a', desc:'Chill, easygoing, loves company.' },
  { id:'guppy',               name:'Guppy',                 rarity:'common',     colour:'#ff80bf', desc:'Tiny but incredibly fancy.' },
  { id:'shrimp',              name:'Shrimp',                rarity:'common',     colour:'#ff9966', desc:'Tiny cleaning crew. Very diligent.' },
  { id:'betta',               name:'Betta',                 rarity:'uncommon',   colour:'#ff6699', desc:'Absolutely stunning, knows it.' },
  { id:'angel',               name:'Angelfish',             rarity:'uncommon',   colour:'#c9b3ff', desc:'Graceful and a little dramatic.' },
  { id:'neontetra',           name:'Neon Tetra',            rarity:'uncommon',   colour:'#a8ffec', desc:'Glows in the dark. Literally.' },
  { id:'corydoras',           name:'Corydoras',             rarity:'uncommon',   colour:'#b0c4a0', desc:'Bottom dweller. Minds their business.' },
  { id:'oscar',               name:'Oscar',                 rarity:'rare',       colour:'#e07840', desc:'Bold personality. Knows what it wants.' },
  { id:'starfish',            name:'Starfish',              rarity:'rare',       colour:'#ff9966', desc:'Not a fish but absolutely iconic.' },
  { id:'discus',              name:'Discus',                rarity:'rare',       colour:'#9b7fe8', desc:'Royalty of freshwater tanks.' },
  { id:'pleco',               name:'Pleco',                 rarity:'rare',       colour:'#8a7a60', desc:'Tank cleaning legend. Unmatched.' },
  { id:'axolotl',             name:'Axolotl',               rarity:'ultra-rare', colour:'#ffb3d9', desc:'Not a fish but makes the rules.' },
  { id:'crayfish',            name:'Crayfish',              rarity:'ultra-rare', colour:'#6ab4f5', desc:'A tiny blue king of the tank.' },
  { id:'jellyfish',           name:'Jellyfish',             rarity:'ultra-rare', colour:'#e8d4ff', desc:'Mesmerising. Slightly terrifying.' },
  { id:'blackdiamondstingray',name:'Black Diamond Stingray',rarity:'legendary',  colour:'#3a2a5a', desc:'Extremely rare. Practically mythical.' },
  { id:'koi',                 name:'Koi',                   rarity:'legendary',  colour:'#ffd700', desc:'Brings luck. Confirmed by everyone.' },
  { id:'zebrashark',          name:'Zebra Shark',           rarity:'legendary',  colour:'#c8b890', desc:'Majestic. Ancient. Unreal.' },
];

const RARITY_WEIGHTS = { common:55, uncommon:25, rare:12, 'ultra-rare':6, legendary:2 };

const BG_COLOURS = [
  {hex:'#f2dede',name:'Rose Blush'}, {hex:'#ffa3a3',name:'Coral Pink'},
  {hex:'#fbcea0',name:'Peach Sorbet'},{hex:'#b5eeb9',name:'Mint Leaf'},
  {hex:'#addfee',name:'Sky Blue'},   {hex:'#d2afea',name:'Lavender'},
  {hex:'#9877a2',name:'Deep Mauve'}, {hex:'#8499c1',name:'Steel Blue'},
  {hex:'#d990a3',name:'Dusty Rose'}, {hex:'#96c8c5',name:'Seafoam'},
];

// ===================== STATE =====================
let state = {
  currentUser: null,
  focusMinutes: 25, breakMinutes: 5, totalMinutes: 120,
  showOverall: true,
  slots: [], currentSlotIndex: 0,
  sessionActive: false, isPaused: false, isFocusPhase: true,
  _pausedForModal: false,
  _lastTickTime: null,
  slotSecondsLeft: 0, overallSecondsLeft: 0,
  timerInterval: null, focusTotalSecs: 0,
  currentFish: null,
  fishStage: 0,
  fishCustomName: null,
  collectedFish: [],
  tankFish: [],
  cryoFish: [],
  todos: [],
  todoFilter: 'all', todoSort: 'priority',
  skippedTasks: [],
  bgColour: '#f2dede',
  incompleteQueue: [],
  draggedTaskId: null,
  notes: [],
};

// ===================== PERSISTENCE =====================
function saveToStorage() {
  const key = state.currentUser ? `pomogotchi_${state.currentUser.email}` : 'pomogotchi_guest';
  localStorage.setItem(key, JSON.stringify({
    todos:state.todos, tankFish:state.tankFish, cryoFish:state.cryoFish,
    fishStage:state.fishStage, fishCustomName:state.fishCustomName,
    currentFish:state.currentFish, collectedFish:state.collectedFish,
    skippedTasks:state.skippedTasks, bgColour:state.bgColour, notes:state.notes,
  }));
}
function loadFromStorage() {
  const key = state.currentUser ? `pomogotchi_${state.currentUser.email}` : 'pomogotchi_guest';
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    Object.assign(state, {
      todos:d.todos||[], tankFish:d.tankFish||[], cryoFish:d.cryoFish||[],
      fishStage:d.fishStage||0, fishCustomName:d.fishCustomName||null,
      currentFish:d.currentFish||null, collectedFish:d.collectedFish||[],
      skippedTasks:d.skippedTasks||[], bgColour:d.bgColour||'#f2dede', notes:d.notes||[],
    });
  } catch(e) {}
}
function getUsers() { return JSON.parse(localStorage.getItem('pomogotchi_users')||'{}'); }
function saveUsers(u) { localStorage.setItem('pomogotchi_users', JSON.stringify(u)); }

// ===================== FISH UTILS =====================
function rollFish() {
  const pool = [];
  FISH_DB.forEach(f => { const w=RARITY_WEIGHTS[f.rarity]||10; for(let i=0;i<w;i++) pool.push(f); });
  return pool[Math.floor(Math.random()*pool.length)];
}
function fishImg(id, size=48) {
  return `<img src="fishdex/${id}.png" alt="${id}" class="pixel-img" style="width:${size}px;height:${size}px"/>`;
}
function fishStageImg(fish, stage, size=72) {
  if (!fish) return '';
  if (stage === 0) {
    return `<div class="fish-egg" style="--egg-colour:${fish.colour}">
      <div class="egg-outer"></div><div class="egg-inner"></div>
    </div>`;
  }
  const opacity = stage===1?0.45 : stage===2?0.75 : 1;
  const s       = stage===1?Math.round(size*0.5) : stage===2?Math.round(size*0.75) : size;
  return `<img src="fishdex/${fish.id}.png" alt="${fish.id}" class="pixel-img tank-fish-sprite"
    style="width:${s}px;height:${s}px;opacity:${opacity}"/>`;
}

// ===================== AUTH =====================
function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.auth-tab-content').forEach(c=>{ c.style.display='none'; });
  btn.classList.add('active');
  const tc=document.getElementById(`tab-${tab}`);
  if(tc) tc.style.display='flex';
}
function handleLogin() {
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pass=document.getElementById('login-password').value;
  const err=document.getElementById('login-error');
  if(!email||!pass){err.textContent='Fill in all fields!';return;}
  const users=getUsers();
  if(!users[email]||users[email].password!==btoa(pass)){err.textContent='Wrong email or password';return;}
  state.currentUser={email,name:users[email].name};
  loadFromStorage();
  document.body.style.background=state.bgColour;
  closeModalAndResume('modal-account');
  updateTrainerChip(); renderTank(); renderSavedFishRow();
}
function handleRegister() {
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim().toLowerCase();
  const pass=document.getElementById('reg-password').value;
  const err=document.getElementById('reg-error');
  if(!name||!email||!pass){err.textContent='Fill in all fields!';return;}
  if(pass.length<6){err.textContent='Password min 6 chars';return;}
  const users=getUsers();
  if(users[email]){err.textContent='Email already registered!';return;}
  users[email]={name,password:btoa(pass),created:new Date().toLocaleDateString()};
  saveUsers(users);
  state.currentUser={email,name};
  loadFromStorage();
  closeModalAndResume('modal-account');
  updateTrainerChip(); renderTank(); renderSavedFishRow();
}
function guestMode() {
  state.currentUser=null; loadFromStorage();
  closeModalAndResume('modal-account'); updateTrainerChip();
}
function handleLogout() {
  saveToStorage(); clearInterval(state.timerInterval);
  state.sessionActive=false; state.currentUser=null;
  updateTrainerChip(); closeModal('modal-account'); resetTimerUI();
}
function deleteAccount() {
  if(!confirm('Delete your account? This cannot be undone!')) return;
  const users=getUsers(); delete users[state.currentUser.email]; saveUsers(users);
  localStorage.removeItem(`pomogotchi_${state.currentUser.email}`);
  state.currentUser=null; closeModal('modal-account');
  updateTrainerChip(); clearInterval(state.timerInterval);
  state.sessionActive=false; resetTimerUI();
}
function updateTrainerChip() {
  const chip=document.getElementById('display-trainer-name');
  if(chip) chip.textContent=state.currentUser?state.currentUser.name.toUpperCase():'GUEST';
}

// ===================== MODAL PAUSE =====================
function pauseForModal() {
  if(state.sessionActive&&!state.isPaused){ state._pausedForModal=true; state.isPaused=true; }
}
function resumeAfterModal() {
  if(state._pausedForModal){ state._pausedForModal=false; state.isPaused=false; state._lastTickTime=Date.now(); }
}
function closeModalAndResume(id){ closeModal(id); resumeAfterModal(); }

// ===================== ACCOUNT MODAL =====================
function openAccountModal() {
  pauseForModal();
  const body=document.getElementById('account-modal-body');
  if(!state.currentUser) {
    body.innerHTML=`
      <div class="auth-tabs-row">
        <button class="auth-tab-btn active" onclick="switchAuthTab('acc-login',this)">LOGIN</button>
        <button class="auth-tab-btn" onclick="switchAuthTab('acc-register',this)">NEW SAVE</button>
      </div>
      <div id="tab-acc-login" class="auth-tab-content" style="display:flex;flex-direction:column;gap:10px">
        <div class="field-group"><label class="y2k-label">EMAIL</label>
          <input type="email" id="login-email" class="y2k-input" placeholder="trainer@email.com"/></div>
        <div class="field-group"><label class="y2k-label">PASSWORD</label>
          <input type="password" id="login-password" class="y2k-input" placeholder="password"/></div>
        <button class="y2k-btn filled-purple full" onclick="handleLogin()">LOGIN</button>
        <p class="auth-error" id="login-error"></p>
        <p class="guest-link" onclick="guestMode()">continue as guest (no saving)</p>
      </div>
      <div id="tab-acc-register" class="auth-tab-content" style="display:none;flex-direction:column;gap:10px">
        <div class="field-group"><label class="y2k-label">NAME</label>
          <input type="text" id="reg-name" class="y2k-input" placeholder="your name"/></div>
        <div class="field-group"><label class="y2k-label">EMAIL</label>
          <input type="email" id="reg-email" class="y2k-input" placeholder="trainer@email.com"/></div>
        <div class="field-group"><label class="y2k-label">PASSWORD</label>
          <input type="password" id="reg-password" class="y2k-input" placeholder="min 6 chars"/></div>
        <button class="y2k-btn filled-pink full" onclick="handleRegister()">CREATE ACCOUNT</button>
        <p class="auth-error" id="reg-error"></p>
      </div>`;
  } else {
    const users=getUsers();
    const created=users[state.currentUser.email]?.created||'unknown';
    body.innerHTML=`
      <div class="account-info-row"><span class="account-info-label">TRAINER</span>
        <span class="account-info-value">${state.currentUser.name}</span></div>
      <div class="account-info-row"><span class="account-info-label">EMAIL</span>
        <span class="account-info-value">${state.currentUser.email}</span></div>
      <div class="account-info-row"><span class="account-info-label">JOINED</span>
        <span class="account-info-value">${created}</span></div>
      <div class="account-info-row"><span class="account-info-label">FISH COLLECTED</span>
        <span class="account-info-value">${state.collectedFish.length} / ${FISH_DB.length}</span></div>
      <div class="account-info-row"><span class="account-info-label">TANK</span>
        <span class="account-info-value">${state.tankFish.length} fish &nbsp;|&nbsp; cryo: ${state.cryoFish.length}</span></div>
      <div class="modal-btns" style="margin-top:8px">
        <button class="y2k-btn small danger" onclick="handleLogout()">log out</button>
        <button class="y2k-btn small danger" onclick="deleteAccount()">delete account</button>
        <button class="y2k-btn small" onclick="closeModalAndResume('modal-account')">close</button>
      </div>`;
  }
  openModal('modal-account');
}

// ===================== SESSION SETUP =====================
function openSetupModal() { pauseForModal(); openModal('modal-setup'); }

function startSession() {
  const focus=parseInt(document.getElementById('setup-focus').value)||25;
  const brk=parseInt(document.getElementById('setup-break').value)||5;
  const total=parseInt(document.getElementById('setup-total').value)||120;
  state.focusMinutes=focus; state.breakMinutes=brk; state.totalMinutes=total;
  state.showOverall=document.getElementById('setup-show-overall').checked;
  const count=Math.max(1,Math.floor(total/(focus+brk)));
  state.slots=Array.from({length:count},(_,i)=>({
    id:i+1, focusSecs:focus*60, breakSecs:brk*60, tasks:[], status:i===0?'focus':'pending'
  }));
  state.currentSlotIndex=0; state.isFocusPhase=true;
  state.isPaused=false; state.sessionActive=true;
  state.overallSecondsLeft=total*60;
  state.slotSecondsLeft=focus*60; state.focusTotalSecs=focus*60;
  // Only roll new fish if no fish growing currently
  const isNewFish = !state.currentFish || state.fishStage>=3;
  if(isNewFish){
    state.currentFish=rollFish(); state.fishStage=0; state.fishCustomName=null;
  }
  closeModal('modal-setup'); resumeAfterModal();
  renderAll(); startTimer(); saveToStorage();
  // Only show rarity reveal when it's a brand new fish
  if(isNewFish) showRarityReveal(state.currentFish);
}

function showRarityReveal(fish) {
  setTimeout(()=>{
    const img=document.getElementById('reveal-fish-img');
    const nm=document.getElementById('reveal-fish-name');
    const re=document.getElementById('reveal-fish-rarity');
    const ds=document.getElementById('reveal-fish-desc');
    if(img) img.innerHTML=fishImg(fish.id,64);
    if(nm)  nm.textContent=fish.name;
    if(re){ re.textContent=fish.rarity.replace('-',' ').toUpperCase(); re.className=`dex-rarity ${fish.rarity}`; }
    if(ds)  ds.textContent=fish.desc;
    pauseForModal(); openModal('modal-fish-reveal');
  },400);
}

// ===================== BACKGROUND-SAFE TIMER =====================
function startTimer() {
  clearInterval(state.timerInterval);
  state._lastTickTime=Date.now();
  state.timerInterval=setInterval(timerLoop,200);
}

function timerLoop() {
  if(state.isPaused||!state.sessionActive) return;
  const now=Date.now();
  const elapsed=Math.floor((now-state._lastTickTime)/1000);
  if(elapsed<1) return;
  state._lastTickTime=now-((now-state._lastTickTime)%1000);
  for(let i=0;i<elapsed;i++){
    if(state.slotSecondsLeft<=0){onPhaseEnd();break;}
    state.slotSecondsLeft--;
    if(state.showOverall&&state.isFocusPhase&&state.overallSecondsLeft>0) state.overallSecondsLeft--;
  }
  updateTimerUI();
}

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&state.sessionActive&&!state.isPaused){
    const now=Date.now();
    const missedSecs=Math.floor((now-state._lastTickTime)/1000);
    if(missedSecs>0){
      state._lastTickTime=now;
      let remaining=missedSecs;
      while(remaining>0&&state.sessionActive){
        if(state.slotSecondsLeft<=remaining){
          remaining-=state.slotSecondsLeft; state.slotSecondsLeft=0; onPhaseEnd();
        } else {
          if(state.showOverall&&state.isFocusPhase) state.overallSecondsLeft=Math.max(0,state.overallSecondsLeft-remaining);
          state.slotSecondsLeft-=remaining; remaining=0;
        }
      }
      updateTimerUI();
    }
  }
});

function onPhaseEnd() {
  if(!state.slots[state.currentSlotIndex]) return;
  const slot=state.slots[state.currentSlotIndex];
  if(state.isFocusPhase){
    if(state.fishStage<3){
      state.fishStage++;
      renderTank();
      // Only prompt naming when fish reaches stage 3 (fully grown)
      if(state.fishStage===3) promptNameFish();
    }
    const incomplete=slot.tasks.filter(t=>!t.completed);
    if(incomplete.length>0){state.incompleteQueue=[...incomplete];showIncompletePrompt();}
    state.isFocusPhase=false; slot.status='break';
    state.slotSecondsLeft=slot.breakSecs; state.focusTotalSecs=slot.breakSecs;
    updateTimerModeUI();
  } else {
    slot.status='done'; state.currentSlotIndex++;
    if(state.currentSlotIndex>=state.slots.length){onSessionEnd();return;}
    const next=state.slots[state.currentSlotIndex];
    next.status='focus'; state.isFocusPhase=true;
    state.slotSecondsLeft=next.focusSecs; state.focusTotalSecs=next.focusSecs;
    updateTimerModeUI();
  }
  renderSlotsOverview(); renderCurrentSlotTasks(); saveToStorage();
}

function onSessionEnd() {
  clearInterval(state.timerInterval); state.sessionActive=false;
  const mt=document.getElementById('main-timer'); if(mt) mt.textContent='DONE!';
  const ts=document.getElementById('tama-status'); if(ts) ts.textContent='session complete!';
  saveToStorage();
}

function togglePause() {
  state.isPaused=!state.isPaused;
  if(!state.isPaused) state._lastTickTime=Date.now();
  const btn=document.getElementById('btn-pause-resume');
  if(btn) btn.textContent=state.isPaused?'RESUME':'PAUSE';
  const mt=document.getElementById('main-timer');
  if(mt) mt.classList.toggle('paused',state.isPaused);
}

function confirmStop() {
  if(confirm('Stop session? Progress is saved.')) {
    clearInterval(state.timerInterval); state.sessionActive=false; saveToStorage(); resetTimerUI();
  }
}

function resetTimerUI() {
  [['main-timer','--:--'],['timer-mode-label','NO SESSION'],['slot-badge','-- / --'],['overall-timer','--:--']].forEach(([id,txt])=>{
    const el=document.getElementById(id); if(el) el.textContent=txt;
  });
  const tb=document.getElementById('timer-bar'); if(tb) tb.style.width='0%';
  const cst=document.getElementById('current-slot-tasks'); if(cst) cst.innerHTML='';
  const sol=document.getElementById('slots-overview-list'); if(sol) sol.innerHTML='';
}

// ===================== RENDER ALL =====================
function renderAll() {
  updateTrainerChip(); updateTimerUI(); updateTimerModeUI();
  renderSlotsOverview(); renderCurrentSlotTasks();
  renderTank(); renderSavedFishRow(); renderSkippedBox(); renderNotes();
  const or=document.getElementById('overall-timer-row');
  if(or) or.style.display=state.showOverall?'flex':'none';
  document.body.style.background=state.bgColour;
}

function updateTimerUI() {
  const mt=document.getElementById('main-timer'); if(mt) mt.textContent=formatTime(state.slotSecondsLeft);
  const ot=document.getElementById('overall-timer'); if(ot) ot.textContent=formatTime(state.overallSecondsLeft);
  const sb=document.getElementById('slot-badge');
  if(sb) sb.textContent=state.slots.length?`SLOT ${state.currentSlotIndex+1} / ${state.slots.length}`:'-- / --';
  const pct=state.focusTotalSecs>0?((state.focusTotalSecs-state.slotSecondsLeft)/state.focusTotalSecs)*100:0;
  const bar=document.getElementById('timer-bar');
  if(bar){bar.style.width=`${Math.min(100,pct)}%`;bar.className='progress-fill'+(state.isFocusPhase?'':' break-fill');}
  const growthPct=(state.fishStage/3)*100;
  const gf=document.getElementById('tama-growth-fill'); if(gf) gf.style.width=`${growthPct}%`;
  const gp=document.getElementById('tama-growth-pct'); if(gp) gp.textContent=`${Math.round(growthPct)}%`;
}

function updateTimerModeUI() {
  const label=document.getElementById('timer-mode-label');
  const timer=document.getElementById('main-timer');
  if(!label||!timer) return;
  label.textContent=state.isFocusPhase?'FOCUS':'BREAK';
  timer.className='timer-display'+(state.isFocusPhase?'':' break-mode');
}

// ===================== SLOTS =====================
function renderSlotsOverview() {
  const el=document.getElementById('slots-overview-list'); if(!el) return;
  el.innerHTML=state.slots.map((slot,i)=>{
    const isActive=i===state.currentSlotIndex, isDone=slot.status==='done';
    let cls='slot-card'; if(isActive)cls+=' active-slot'; if(isDone)cls+=' done-slot';
    const tasks=slot.tasks.map(t=>{
      let tc='slot-task-mini'; if(t.completed)tc+=' done'; else if(isActive)tc+=' active';
      return `<div class="${tc}">- ${t.name}</div>`;
    }).join('')||'<div class="slot-task-mini">no tasks</div>';
    return `<div class="${cls}"><div class="slot-header">
      <span class="slot-num">SLOT ${i+1}</span>
      <span class="slot-time">${slot.focusSecs/60}m / ${slot.breakSecs/60}m</span>
    </div>${tasks}</div>`;
  }).join('');
}

// ===================== CURRENT SLOT TASKS =====================
function renderCurrentSlotTasks() {
  const ul=document.getElementById('current-slot-tasks'); if(!ul) return;
  const slot=state.slots[state.currentSlotIndex];
  if(!slot){ul.innerHTML='';return;}
  ul.innerHTML=slot.tasks.map(task=>{
    let cls='slot-task-item'; if(task.completed)cls+=' completed';
    return `<li class="${cls}" draggable="true"
      ondragstart="dragTaskStart('${task.id}')" ondragend="dragTaskEnd()">
      <span class="task-tick" onclick="toggleTaskComplete('${task.id}')">${task.completed?'[x]':'[ ]'}</span>
      <span class="task-name">${task.name}</span>
      <button class="y2k-btn tiny danger task-skip-btn" onclick="skipCurrentTask('${task.id}')">skip</button>
    </li>`;
  }).join('');
}

// ===================== TASK COMPLETE =====================
function toggleTaskComplete(id) {
  const slot=state.slots[state.currentSlotIndex]; if(!slot) return;
  const task=slot.tasks.find(t=>t.id===id); if(!task) return;
  task.completed=!task.completed;
  const mt=state.todos.find(t=>t.id===id);
  if(mt) mt.status=task.completed?'complete':'in-progress';
  if(task.completed) triggerConfetti();
  if(slot.tasks.length>0&&slot.tasks.every(t=>t.completed)) flashTankGlow();
  renderCurrentSlotTasks(); renderSlotsOverview(); saveToStorage();
}

// ===================== ADD TASKS =====================
function inlineAddTask() {
  const input=document.getElementById('inline-task-input');
  const name=input.value.trim(); if(!name) return;
  const task={id:'task_'+Date.now(),name,due:'',priority:'medium',status:'in-progress',completed:false};
  state.todos.push(task);
  const slot=state.slots[state.currentSlotIndex]; if(slot) slot.tasks.push({...task});
  input.value=''; renderCurrentSlotTasks(); renderSlotsOverview(); saveToStorage();
}

function openAddFromTaskList() { pauseForModal(); renderTaskListPicker(); openModal('modal-task-picker'); }
function renderTaskListPicker() {
  const el=document.getElementById('task-picker-list'); if(!el) return;
  const pending=state.todos.filter(t=>t.status!=='complete')
    .sort((a,b)=>({high:0,medium:1,low:2}[a.priority]||1)-({high:0,medium:1,low:2}[b.priority]||1));
  el.innerHTML=pending.length
    ?pending.map(t=>`<div class="task-picker-item" onclick="addTaskFromPicker('${t.id}')">
        <span class="task-picker-name">${t.name}</span>
        <span class="badge ${t.priority}">${t.priority}</span>
        ${t.due?`<span class="due-badge">${t.due}</span>`:''}
      </div>`).join('')
    :'<p class="hint-text">No pending tasks!</p>';
}
function addTaskFromPicker(id) {
  const mt=state.todos.find(t=>t.id===id); if(!mt) return;
  const slot=state.slots[state.currentSlotIndex]; if(!slot) return;
  if(!slot.tasks.find(t=>t.id===id)) slot.tasks.push({...mt});
  renderCurrentSlotTasks(); renderSlotsOverview();
  closeModalAndResume('modal-task-picker'); saveToStorage();
}

// ===================== DRAG TO SKIP =====================
function dragTaskStart(id){state.draggedTaskId=id;}
function dragTaskEnd(){state.draggedTaskId=null;}
function allowDrop(e){e.preventDefault();}
function dropToSkip(e){
  e.preventDefault(); if(!state.draggedTaskId) return;
  skipCurrentTask(state.draggedTaskId); state.draggedTaskId=null;
}

// ===================== SKIP BUTTON =====================
function skipCurrentTask(id) {
  const slot=state.slots[state.currentSlotIndex]; if(!slot) return;
  slot.tasks=slot.tasks.filter(t=>t.id!==id);
  const mt=state.todos.find(t=>t.id===id); if(mt) mt.status='skipped';
  state.skippedTasks.push({id,name:mt?mt.name:id,note:''});
  renderCurrentSlotTasks(); renderSkippedBox(); saveToStorage();
}

// ===================== SKIPPED BOX =====================
function renderSkippedBox() {
  const list=document.getElementById('skipped-list'); if(!list) return;
  list.innerHTML=state.skippedTasks.map((s,i)=>`
    <li class="skipped-item">
      <span class="skipped-name">${s.name}</span>
      <button class="y2k-btn tiny" onclick="editSkipNote(${i})">+ note</button>
      ${s.note?`<div class="skip-note-preview">${s.note}</div>`:''}
    </li>`).join('');
}
function editSkipNote(i) {
  const note=prompt(`Note for "${state.skippedTasks[i].name}":`,state.skippedTasks[i].note||'');
  if(note!==null){state.skippedTasks[i].note=note;renderSkippedBox();saveToStorage();}
}

// ===================== FISH TANK =====================
function renderTank() {
  const tank=document.getElementById('fish-tank'); if(!tank) return;
  // Remove old fish elements
  tank.querySelectorAll('.fish-main,.fish-swimmer').forEach(e=>e.remove());

  // Show all fully grown tank fish swimming around
  state.tankFish.forEach((entry,i)=>{
    const swimmer=document.createElement('div');
    swimmer.className='fish-swimmer';
    // Vary speed, vertical position, delay per fish
    const duration = 18 + (i*1.3)%7;
    const yPos     = 15 + (i*17)%55;
    const delay    = -(i*1.7)%duration;
    swimmer.style.cssText=`top:${yPos}%;animation-duration:${duration}s;animation-delay:${delay}s`;
    swimmer.innerHTML=`<img src="fishdex/${entry.fish.id}.png" alt="${entry.fish.id}" class="pixel-img tank-fish-sprite" style="width:32px;height:32px"/>`;
    tank.appendChild(swimmer);
  });

  // Show current growing fish (egg or growing stages)
  if(state.currentFish){
    const wrapper=document.createElement('div');
    wrapper.className='fish-main';
    wrapper.innerHTML=fishStageImg(state.currentFish,state.fishStage,72);
    tank.appendChild(wrapper);
  }

  // Update status text
  const displayName=state.fishCustomName||state.currentFish?.name||'';
  const ts=document.getElementById('tama-status');
  if(ts){
    if(!state.currentFish) ts.textContent='start a session to grow your fish!';
    else if(state.fishStage<3) ts.textContent=`${displayName} growing... (stage ${state.fishStage+1}/4)`;
    else ts.textContent=`${displayName} is fully grown!`;
  }
  const nd=document.getElementById('tama-name-display');
  if(nd) nd.textContent=displayName||'FISH TANK';
}

function flashTankGlow() {
  const tank=document.getElementById('fish-tank'); if(!tank) return;
  tank.classList.add('tank-glow');
  setTimeout(()=>tank.classList.remove('tank-glow'),3000);
}

// ===================== NAMING FISH =====================
function promptNameFish() {
  setTimeout(()=>{
    const lb=document.getElementById('name-fish-label');
    const nm=document.getElementById('name-fish-input');
    if(lb) lb.textContent=`Your ${state.currentFish.name} is fully grown! Give it a nickname:`;
    if(nm) nm.value='';
    pauseForModal(); openModal('modal-name-fish');
  },600);
}
function saveCustomFishName() {
  const input=document.getElementById('name-fish-input');
  state.fishCustomName=input.value.trim()||state.currentFish.name;
  addFishToTank(state.currentFish,state.fishCustomName);
  // Spawn new egg immediately
  state.currentFish=rollFish(); state.fishStage=0; state.fishCustomName=null;
  closeModalAndResume('modal-name-fish');
  renderTank(); renderSavedFishRow(); saveToStorage();
  showRarityReveal(state.currentFish);
}
function skipNaming() {
  const name=state.currentFish.name;
  addFishToTank(state.currentFish,name);
  // Spawn new egg immediately
  state.currentFish=rollFish(); state.fishStage=0; state.fishCustomName=null;
  closeModalAndResume('modal-name-fish');
  renderTank(); renderSavedFishRow(); saveToStorage();
  showRarityReveal(state.currentFish);
}

// ===================== TANK COLLECTION =====================
function addFishToTank(fish,customName) {
  if(!state.collectedFish.includes(fish.id)) state.collectedFish.push(fish.id);
  const entry={fish,customName,addedAt:Date.now()};
  if(state.tankFish.length<25){
    state.tankFish.push(entry);
  } else if(state.tankFish.length<30){
    state.tankFish.push(entry);
    openTankFullModal();
  } else {
    const oldest=state.tankFish.shift();
    state.cryoFish.push(oldest);
    state.tankFish.push(entry);
    alert(`Tank full (30 max)! ${oldest.customName} was cryo-frozen automatically.`);
  }
}

function openTankFullModal() {
  pauseForModal(); renderTankManageList(); openModal('modal-tank-manage');
}
function renderTankManageList() {
  const el=document.getElementById('tank-manage-list'); if(!el) return;
  el.innerHTML=`<p class="hint-text" style="margin-bottom:8px">Tank has 25+ fish! Manage space:</p>`
    +state.tankFish.map((f,i)=>`
      <div class="tank-manage-item">
        ${fishImg(f.fish.id,28)}
        <span class="tank-manage-name">${f.customName}</span>
        <span class="dex-rarity ${f.fish.rarity}" style="font-size:5px">${f.fish.rarity}</span>
        <button class="y2k-btn tiny" onclick="cryoFreezeFish(${i})">cryo</button>
        <button class="y2k-btn tiny danger" onclick="reAdoptFish(${i})">re-adopt</button>
      </div>`).join('');
  if(state.cryoFish.length>0){
    el.innerHTML+=`<div class="y2k-label" style="margin-top:12px">CRYO STORAGE (${state.cryoFish.length})</div>`
      +state.cryoFish.map((f,i)=>`
        <div class="tank-manage-item">
          ${fishImg(f.fish.id,28)}
          <span class="tank-manage-name">${f.customName}</span>
          <button class="y2k-btn tiny mint" onclick="thawFish(${i})">thaw</button>
          <button class="y2k-btn tiny danger" onclick="reAdoptCryo(${i})">re-adopt</button>
        </div>`).join('');
  }
}
function cryoFreezeFish(i){
  const f=state.tankFish.splice(i,1)[0]; state.cryoFish.push(f);
  renderTankManageList(); renderSavedFishRow(); saveToStorage();
  if(state.tankFish.length<=25) closeModalAndResume('modal-tank-manage');
}
function thawFish(i){
  if(state.tankFish.length>=30){alert('Tank is still full (30 max)!');return;}
  const f=state.cryoFish.splice(i,1)[0]; state.tankFish.push(f);
  renderTankManageList(); renderSavedFishRow(); saveToStorage();
}
function reAdoptFish(i){
  if(!confirm(`Re-adopt ${state.tankFish[i].customName}? Removes them permanently.`)) return;
  state.tankFish.splice(i,1); renderTankManageList(); renderSavedFishRow(); saveToStorage();
  if(state.tankFish.length<=25) closeModalAndResume('modal-tank-manage');
}
function reAdoptCryo(i){
  if(!confirm(`Re-adopt ${state.cryoFish[i].customName}? Removes them permanently.`)) return;
  state.cryoFish.splice(i,1); renderTankManageList(); saveToStorage();
}

function renderSavedFishRow() {
  const row=document.getElementById('saved-pets-row'); if(!row) return;
  // Tank fish row
  let html=state.tankFish.slice(0,25).map(f=>`
    <div class="saved-fish-item" title="${f.customName} (${f.fish.rarity})">
      <img src="fishdex/${f.fish.id}.png" alt="${f.fish.id}" class="pixel-img" style="width:24px;height:24px"/>
      <span class="saved-fish-name">${f.customName}</span>
    </div>`).join('');
  // Cryo section below if any
  if(state.cryoFish.length>0){
    html+=`<div class="cryo-row">
      <div class="cryo-row-label">CRYO STORAGE (${state.cryoFish.length})</div>
      ${state.cryoFish.map(f=>`
        <div class="saved-fish-item" title="${f.customName} [cryo]" style="opacity:0.6;border-color:var(--blue)">
          <img src="fishdex/${f.fish.id}.png" alt="${f.fish.id}" class="pixel-img" style="width:24px;height:24px;filter:grayscale(0.5)"/>
          <span class="saved-fish-name">${f.customName}</span>
        </div>`).join('')}
      <button class="cryo-badge" onclick="openTankFullModal()">manage</button>
    </div>`;
  }
  row.innerHTML=html;
}

// ===================== FISH DEX =====================
function openFishDex() {
  pauseForModal();
  const grid=document.getElementById('dex-grid'); if(!grid) return;
  const grouped={common:[],uncommon:[],rare:[],'ultra-rare':[],legendary:[]};
  FISH_DB.forEach(f=>{if(grouped[f.rarity])grouped[f.rarity].push(f);});
  const labels={common:'COMMON',uncommon:'UNCOMMON',rare:'RARE','ultra-rare':'ULTRA RARE',legendary:'LEGENDARY'};
  let html='';
  Object.entries(grouped).forEach(([rarity,fish])=>{
    html+=`<div class="dex-section-label ${rarity}">${labels[rarity]}</div>
      <div class="dex-row">`;
    html+=fish.map(f=>{
      const owned=state.collectedFish.includes(f.id);
      return `<div class="dex-card ${owned?'':'locked'}">
        <div class="dex-fish-img">${owned?fishImg(f.id,40):'<div class="dex-locked-img">?</div>'}</div>
        <div class="dex-fish-name">${owned?f.name:'???'}</div>
        <div class="dex-rarity ${f.rarity}">${rarity.replace('-',' ')}</div>
        ${owned?`<div class="dex-fish-desc">"${f.desc}"</div>`:''}
      </div>`;
    }).join('');
    html+=`</div>`;
  });
  grid.innerHTML=html;
  openModal('modal-fish-dex');
}

// ===================== INCOMPLETE TASK =====================
function showIncompletePrompt() {
  if(!state.incompleteQueue.length) return;
  const task=state.incompleteQueue[0];
  const msg=document.getElementById('incomplete-task-msg');
  if(msg) msg.textContent=`"${task.name}" is not done. What do?`;
  const opts=document.getElementById('incomplete-task-options'); if(!opts) return;
  const future=state.slots.slice(state.currentSlotIndex+1);
  let html=future.map((slot,i)=>`<button class="y2k-btn blue small" onclick="shiftTask('${task.id}',${slot.id})">move to slot ${state.currentSlotIndex+2+i}</button>`).join('');
  html+=`<button class="y2k-btn small mint" onclick="extendSession('${task.id}')">extend time</button>`;
  html+=`<button class="y2k-btn small danger" onclick="skipTask('${task.id}')">skip</button>`;
  opts.innerHTML=html;
  pauseForModal(); openModal('modal-incomplete-task');
}
function shiftTask(taskId,targetSlotId){
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  const ts=state.slots.find(s=>s.id===targetSlotId), mt=state.todos.find(t=>t.id===taskId);
  if(ts&&mt){ts.tasks.push({...mt}); mt.slotAssignment=targetSlotId;}
  closeModalAndResume('modal-incomplete-task'); nextIncomplete();
  renderCurrentSlotTasks(); renderSlotsOverview(); saveToStorage();
}
function extendSession(taskId){
  const extra=parseInt(prompt('Add how many minutes?','30'))||30;
  state.overallSecondsLeft+=extra*60; state.totalMinutes+=extra;
  const ns={id:state.slots.length+1,focusSecs:state.focusMinutes*60,breakSecs:state.breakMinutes*60,tasks:[],status:'pending'};
  const mt=state.todos.find(t=>t.id===taskId); if(mt) ns.tasks.push({...mt});
  state.slots.push(ns);
  state.slots.forEach(s=>{if(s.id!==ns.id)s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  closeModalAndResume('modal-incomplete-task'); nextIncomplete();
  renderSlotsOverview(); renderCurrentSlotTasks(); saveToStorage();
}
function skipTask(taskId){
  const mt=state.todos.find(t=>t.id===taskId); if(mt) mt.status='skipped';
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  state.skippedTasks.push({id:taskId,name:mt?mt.name:taskId,note:''});
  closeModalAndResume('modal-incomplete-task'); nextIncomplete();
  renderCurrentSlotTasks(); renderSkippedBox(); saveToStorage();
}
function nextIncomplete(){state.incompleteQueue.shift();if(state.incompleteQueue.length>0)showIncompletePrompt();}

// ===================== TODO =====================
function openTodoModal(){ pauseForModal(); renderTodoList(); openModal('modal-todo'); }
function renderTodoList(){
  const c=document.getElementById('todo-modal-list'); if(!c) return;
  let tasks=[...state.todos];
  if(state.todoFilter!=='all') tasks=tasks.filter(t=>t.status===state.todoFilter);
  const pMap={high:0,medium:1,low:2},sMap={'not-started':0,'in-progress':1,complete:2,skipped:3};
  if(state.todoSort==='due') tasks.sort((a,b)=>(a.due||'9999')<(b.due||'9999')?-1:1);
  else if(state.todoSort==='priority') tasks.sort((a,b)=>(pMap[a.priority]||1)-(pMap[b.priority]||1));
  else if(state.todoSort==='status') tasks.sort((a,b)=>(sMap[a.status]||0)-(sMap[b.status]||0));
  if(!tasks.length){c.innerHTML='<p class="hint-text">No tasks yet!</p>';return;}
  c.innerHTML=tasks.map(t=>`
    <div class="todo-card">
      <span class="todo-tick" onclick="toggleTodoComplete('${t.id}')">${t.status==='complete'?'[x]':'[ ]'}</span>
      <div class="todo-card-body">
        <div class="todo-card-name ${t.status==='complete'?'done':''}">${t.name}</div>
        <div class="todo-card-meta">
          <span class="badge ${t.priority}">${t.priority}</span>
          <span class="badge ${t.status}">${formatStatus(t.status)}</span>
          ${t.due?`<span class="due-badge">${t.due}</span>`:''}
        </div>
      </div>
      <div class="todo-card-actions">
        <button class="y2k-btn tiny" onclick="openEditStatus('${t.id}')">status</button>
        <button class="y2k-btn tiny danger" onclick="deleteTask('${t.id}')">x</button>
      </div>
    </div>`).join('');
}
function toggleTodoComplete(id){
  const t=state.todos.find(t=>t.id===id); if(!t) return;
  t.status=t.status==='complete'?'not-started':'complete'; t.completed=t.status==='complete';
  if(t.completed) triggerConfetti();
  renderTodoList(); saveToStorage();
}
function todoModalAddTask(){
  const name=document.getElementById('todo-modal-task-name').value.trim(); if(!name) return;
  const task={id:'task_'+Date.now(),name,
    due:document.getElementById('todo-modal-due').value,
    priority:document.getElementById('todo-modal-priority').value,
    status:'not-started',completed:false};
  state.todos.push(task);
  document.getElementById('todo-modal-task-name').value='';
  renderTodoList(); saveToStorage();
}
function sortTodoModal(by){state.todoSort=by;renderTodoList();}
function filterTodoModal(f){state.todoFilter=f;renderTodoList();}
function deleteTask(id){
  if(!confirm('Delete this task?')) return;
  state.todos=state.todos.filter(t=>t.id!==id);
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});
  renderTodoList(); renderCurrentSlotTasks(); saveToStorage();
}
function openEditStatus(id){
  const t=state.todos.find(t=>t.id===id); if(!t) return;
  const statuses=['not-started','in-progress','complete','skipped'];
  const c=prompt(`Change status for "${t.name}"\nOptions: ${statuses.join(', ')}`,t.status);
  if(c&&statuses.includes(c)){t.status=c;if(c==='complete')t.completed=true;renderTodoList();saveToStorage();}
}

// ===================== NOTES =====================
function addNote() {
  const input=document.getElementById('note-input');
  const text=input.value.trim(); if(!text) return;
  state.notes.push({id:'note_'+Date.now(), text});
  input.value=''; renderNotes(); saveToStorage();
}
function deleteNote(id) {
  state.notes=state.notes.filter(n=>n.id!==id);
  renderNotes(); saveToStorage();
}
function renderNotes() {
  const el=document.getElementById('notes-list'); if(!el) return;
  el.innerHTML=state.notes.length
    ? state.notes.map(n=>`
        <div class="note-item">
          <span class="note-text">${n.text}</span>
          <button class="y2k-btn tiny danger" onclick="deleteNote('${n.id}')">x</button>
        </div>`).join('')
    : '<p class="hint-text" style="font-size:10px">no notes yet!</p>';
}

// ===================== SETTINGS =====================
function openSettings(){ pauseForModal(); openModal('modal-settings'); }
function setBg(c){
  state.bgColour=c; document.body.style.background=c;
  document.querySelectorAll('.bg-swatch').forEach(s=>s.classList.toggle('active',s.dataset.colour===c));
  saveToStorage();
}

// ===================== CONFETTI =====================
function triggerConfetti(){
  const canvas=document.getElementById('confetti-canvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const colours=['#ffb3d9','#c9b3ff','#a8d8ff','#b3f0e0','#fff0a8','#ffd4b3','#ff80bf'];
  const pieces=Array.from({length:100},()=>({
    x:Math.random()*canvas.width,y:-10,r:Math.random()*6+3,d:Math.random()*2+2,
    colour:colours[Math.floor(Math.random()*colours.length)],tilt:Math.random()*10-5,tiltA:0,
  }));
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{ctx.beginPath();ctx.lineWidth=p.r;ctx.strokeStyle=p.colour;
      ctx.moveTo(p.x+p.tilt,p.y);ctx.lineTo(p.x,p.y+p.tilt+p.r/2);ctx.stroke();
      p.y+=p.d+1;p.tiltA+=0.1;p.tilt=Math.sin(p.tiltA)*12;});
    frame++; if(frame<150) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

// ===================== MODAL HELPERS =====================
function openModal(id){const el=document.getElementById(id);if(el)el.classList.remove('hidden');}
function closeModal(id){const el=document.getElementById(id);if(el)el.classList.add('hidden');}

// ===================== UTILS =====================
function formatTime(s){
  if(!s||s<0)s=0;
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return h>0?`${pad(h)}:${pad(m)}:${pad(sec)}`:`${pad(m)}:${pad(sec)}`;
}
function pad(n){return String(n).padStart(2,'0');}
function formatStatus(s){return({'not-started':'not started','in-progress':'in progress',complete:'complete',skipped:'skipped'})[s]||s;}

// ===================== BOOT =====================
window.addEventListener('DOMContentLoaded',()=>{
  loadFromStorage();
  document.body.style.background=state.bgColour;
  updateTrainerChip(); renderAll();
  if(!state.currentUser) openAccountModal();
  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{if(e.target===o){closeModal(o.id);resumeAfterModal();}});
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&state.sessionActive&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
      e.preventDefault(); togglePause();
    }
    if(e.code==='Enter'&&document.activeElement.id==='inline-task-input') inlineAddTask();
    if(e.code==='Enter'&&document.activeElement.id==='todo-modal-task-name') todoModalAddTask();
    if(e.code==='Enter'&&document.activeElement.id==='note-input') addNote();
  });
  const skipZone=document.getElementById('skip-drop-zone');
  if(skipZone){skipZone.addEventListener('dragover',allowDrop);skipZone.addEventListener('drop',dropToSkip);}
});
