/* ================================================
   POMOGOTCHI — app.js  ✨ Pastel Y2K Edition
   ================================================ */

// ===================== FISH DATABASE =====================
const FISH_DB = [
  // COMMON
  { id:'goldfish',     name:'Goldfish',        emoji:'🐟', rarity:'common',     colour:'#ffb347', desc:'A classic! Always happy to see you.' },
  { id:'bluefish',     name:'Blue Tang',       emoji:'🐠', rarity:'common',     colour:'#6ab4f5', desc:'Just keep swimming!' },
  { id:'greenfish',    name:'Jade Guppy',      emoji:'🐟', rarity:'common',     colour:'#70d9bc', desc:'Small but mighty.' },
  { id:'pinkfish',     name:'Rosy Danio',      emoji:'🐟', rarity:'common',     colour:'#ffb3d9', desc:'Loves bubble tea apparently.' },
  { id:'orangefish',   name:'Clownfish',       emoji:'🐠', rarity:'common',     colour:'#ff8c42', desc:'NOT lost. Very found.' },

  // UNCOMMON
  { id:'angelfish',    name:'Angelfish',       emoji:'🐡', rarity:'uncommon',   colour:'#c9b3ff', desc:'Graceful and a little dramatic.' },
  { id:'betta',        name:'Betta',           emoji:'🐠', rarity:'uncommon',   colour:'#ff80bf', desc:'Absolutely stunning, knows it.' },
  { id:'zebra',        name:'Zebra Fish',      emoji:'🐟', rarity:'uncommon',   colour:'#b8d4ff', desc:'Speedy little racer.' },
  { id:'neon',         name:'Neon Tetra',      emoji:'🐠', rarity:'uncommon',   colour:'#a8ffec', desc:'Glows in the dark. Literally.' },

  // RARE
  { id:'discus',       name:'Discus Fish',     emoji:'🐡', rarity:'rare',       colour:'#9b7fe8', desc:'Royalty of freshwater tanks.' },
  { id:'mandarinfish', name:'Mandarin Fish',   emoji:'🐠', rarity:'rare',       colour:'#ff6b6b', desc:'The most colourful fish ever??' },
  { id:'axolotl',      name:'Axolotl',         emoji:'🦎', rarity:'rare',       colour:'#ffb3d9', desc:'Not a fish but makes the rules.' },
  { id:'shrimp-rare',  name:'Cherry Shrimp',   emoji:'🦐', rarity:'rare',       colour:'#ff8c42', desc:'Tiny, red, perfect.' },

  // ULTRA RARE
  { id:'lionfish',     name:'Lionfish',        emoji:'🐡', rarity:'ultra-rare', colour:'#ff4444', desc:'Dangerous but stunning. Do not touch.' },
  { id:'leaffish',     name:'Leaf Scorpion',   emoji:'🐟', rarity:'ultra-rare', colour:'#8bc34a', desc:'Looks like a leaf. Trust nothing.' },
  { id:'crayfish-ur',  name:'Blue Crayfish',   emoji:'🦞', rarity:'ultra-rare', colour:'#6ab4f5', desc:'A tiny blue king.' },
  { id:'ghost',        name:'Ghost Fish',      emoji:'🐡', rarity:'ultra-rare', colour:'#e8e8ff', desc:'Translucent and mysterious.' },

  // LEGENDARY
  { id:'dragon',       name:'Dragon Goby',     emoji:'🐉', rarity:'legendary',  colour:'#ffe066', desc:'Ancient. Wise. Spectacular.' },
  { id:'rainbow',      name:'Rainbow Fish',    emoji:'🌈', rarity:'legendary',  colour:'#ff80bf', desc:'Every colour at once. Impossible.' },
  { id:'golden',       name:'Golden Koi',      emoji:'🏅', rarity:'legendary',  colour:'#ffd700', desc:'Brings luck. Confirmed by everyone.' },
];

const RARITY_WEIGHTS = { common:55, uncommon:25, rare:12, 'ultra-rare':6, legendary:2 };

const PASTEL_COLOURS = [
  '#ffb3d9','#ff80bf','#c9b3ff','#9b7fe8','#a8d8ff',
  '#6ab4f5','#b3f0e0','#70d9bc','#ffd4b3','#ffb080',
  '#fff0a8','#ffe066','#ffc8e8','#d4f0ff','#e8d4ff',
];

// ===================== STATE =====================
let state = {
  currentUser: null,
  focusMinutes: 25, breakMinutes: 5, totalMinutes: 120,
  showOverall: true,
  slots: [], currentSlotIndex: 0,
  sessionActive: false, isPaused: false, isFocusPhase: true,
  slotSecondsLeft: 0, overallSecondsLeft: 0,
  timerInterval: null, focusTotalSecs: 0,
  focusElapsedSecs: 0,
  // Fish / Tamagotchi
  currentFish: null,   // fish from FISH_DB
  petName: '',
  petGrowth: 0,        // 0–100
  petState: 'normal',  // normal | damaged | glowing
  chosenColour: null,  // slot 4 colour choice
  collectedFish: [],   // ids of fish collected
  savedPets: [],       // grown fish {fish, colour, name}
  snailCount: 0,       // appears every 3 fish
  // Todo
  todos: [], selectedTodoIds: [],
  todoFilter: 'all', todoSort: 'due',
  // UI
  bgColour: '#f2dede',
  incompleteQueue: [],
};

// ===================== PERSISTENCE =====================
function saveToStorage() {
  const key = state.currentUser ? `pomogotchi_${state.currentUser.email}` : 'pomogotchi_guest';
  localStorage.setItem(key, JSON.stringify({
    todos: state.todos, savedPets: state.savedPets,
    petGrowth: state.petGrowth, petName: state.petName,
    currentFish: state.currentFish, chosenColour: state.chosenColour,
    collectedFish: state.collectedFish, snailCount: state.snailCount,
    bgColour: state.bgColour,
  }));
}
function loadFromStorage() {
  const key = state.currentUser ? `pomogotchi_${state.currentUser.email}` : 'pomogotchi_guest';
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    Object.assign(state, {
      todos: d.todos||[], savedPets: d.savedPets||[],
      petGrowth: d.petGrowth||0, petName: d.petName||'',
      currentFish: d.currentFish||null, chosenColour: d.chosenColour||null,
      collectedFish: d.collectedFish||[], snailCount: d.snailCount||0,
      bgColour: d.bgColour||'#b8c8ff',
    });
  } catch(e) {}
}
function getUsers() { return JSON.parse(localStorage.getItem('pomogotchi_users')||'{}'); }
function saveUsers(u) { localStorage.setItem('pomogotchi_users', JSON.stringify(u)); }

// ===================== FISH RARITY =====================
function rollFish() {
  const pool = [];
  FISH_DB.forEach(f => {
    const w = RARITY_WEIGHTS[f.rarity]||10;
    for(let i=0;i<w;i++) pool.push(f);
  });
  return pool[Math.floor(Math.random()*pool.length)];
}

// ===================== AUTH =====================
function switchAuthTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
}
function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  if (!email||!pass) { err.textContent='⚠ fill in all fields!'; return; }
  const users = getUsers();
  if (!users[email]||users[email].password!==btoa(pass)) { err.textContent='⚠ wrong email or password'; return; }
  state.currentUser = {email, name:users[email].name};
  loadFromStorage();
  goToSetup();
}
function handleRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-password').value;
  const err   = document.getElementById('reg-error');
  if (!name||!email||!pass) { err.textContent='⚠ fill in all fields!'; return; }
  if (pass.length<6) { err.textContent='⚠ password needs 6+ chars'; return; }
  const users = getUsers();
  if (users[email]) { err.textContent='⚠ email already registered!'; return; }
  users[email] = {name, password:btoa(pass)};
  saveUsers(users);
  state.currentUser = {email, name};
  loadFromStorage();
  goToSetup();
}
function guestMode() { state.currentUser=null; loadFromStorage(); goToSetup(); }
function handleLogout() {
  saveToStorage();
  clearInterval(state.timerInterval);
  state.sessionActive=false;
  showScreen('screen-auth');
}

// ===================== NAVIGATION =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goToSetup() {
  document.body.style.background = state.bgColour;
  generateSlots();
  populateSetupTasks();
  document.getElementById('pet-name-input').value = state.petName;
  if (state.currentFish && state.petGrowth>0 && state.petGrowth<100) {
    document.getElementById('pet-locked-msg').classList.remove('hidden');
    document.getElementById('pet-choice-area').classList.add('hidden');
  }
  showScreen('screen-setup');
}
function goBack() {
  if (state.sessionActive) showScreen('screen-main');
  else showScreen('screen-setup');
}
function goToTodoPage() { renderTodoPage(); showScreen('screen-todo'); }

// ===================== SETUP =====================
function generateSlots() {
  const focus = parseInt(document.getElementById('focus-time').value)||25;
  const brk   = parseInt(document.getElementById('break-time').value)||5;
  const total = parseInt(document.getElementById('total-time').value)||120;
  const count = Math.max(1, Math.floor(total/(focus+brk)));
  state.focusMinutes=focus; state.breakMinutes=brk; state.totalMinutes=total;
  state.slots = Array.from({length:count},(_,i)=>({
    id:i+1, focusSecs:focus*60, breakSecs:brk*60, tasks:[], status:'pending'
  }));
  renderSlotAssignment();
}
function renderSlotAssignment() {
  const el = document.getElementById('slot-task-assignment');
  if (!state.todos.length) { el.innerHTML='<p class="hint-text">No tasks yet — add some in the To-Do list!</p>'; return; }
  let html = `<div class="slot-assign-item"><span class="slot-assign-label">OVERALL</span><div class="slot-task-chips">`;
  state.todos.forEach(t=>{
    const cls = t.slotAssignment==='overall'?'overall':'';
    html+=`<span class="task-chip ${cls}" onclick="assignTask('${t.id}','overall')">${t.name}</span>`;
  });
  html+=`</div></div>`;
  state.slots.forEach((slot,i)=>{
    html+=`<div class="slot-assign-item"><span class="slot-assign-label">SLOT ${i+1}</span><div class="slot-task-chips">`;
    state.todos.forEach(t=>{
      const cls = t.slotAssignment===slot.id?'assigned':'';
      html+=`<span class="task-chip ${cls}" onclick="assignTask('${t.id}',${slot.id})">${t.name}</span>`;
    });
    html+=`</div></div>`;
  });
  el.innerHTML=html;
}
function assignTask(id,target) {
  const t=state.todos.find(t=>t.id===id);
  if(t){ t.slotAssignment=target; renderSlotAssignment(); saveToStorage(); }
}
function populateSetupTasks() {
  state.todos.forEach(t=>{ if(t.slotAssignment===undefined) t.slotAssignment=null; });
  renderSlotAssignment();
}

// ===================== START SESSION =====================
function startSession() {
  const nameInput = document.getElementById('pet-name-input').value.trim();
  if (!nameInput && !state.petName) { alert('Name your fish tank first! 🐠'); return; }
  if (nameInput) state.petName = nameInput;

  state.showOverall = document.getElementById('show-overall').checked;

  // Roll fish if none or fully grown
  if (!state.currentFish || state.petGrowth>=100) {
    if (state.petGrowth>=100) {
      const old = state.currentFish;
      state.savedPets.push({fish:old, colour:state.chosenColour||old.colour, name:state.petName});
      state.collectedFish.push(old.id);
      state.snailCount++;
    }
    state.currentFish = rollFish();
    state.petGrowth   = 0;
    state.chosenColour= null;
    showRarityReveal(state.currentFish);
  }

  state.slots.forEach(slot=>{
    slot.tasks = state.todos.filter(t=>t.slotAssignment===slot.id).map(t=>({...t}));
  });
  const overallTasks = state.todos.filter(t=>t.slotAssignment==='overall').map(t=>({...t}));
  if (overallTasks.length>0 && state.slots.length>0) state.slots[0].tasks.push(...overallTasks);

  state.currentSlotIndex=0; state.isFocusPhase=true;
  state.isPaused=false; state.sessionActive=true;
  state.focusElapsedSecs=0;
  state.overallSecondsLeft=state.totalMinutes*60;
  state.slotSecondsLeft=state.slots[0].focusSecs;
  state.focusTotalSecs=state.slots[0].focusSecs;
  state.slots[0].status='focus';

  renderMainScreen();
  showScreen('screen-main');
  startTimer();
  saveToStorage();
}

function showRarityReveal(fish) {
  const rarityEmoji = {common:'⚪',uncommon:'🟢',rare:'🔵','ultra-rare':'🟣',legendary:'🌟'};
  setTimeout(()=>{
    alert(`✨ ${rarityEmoji[fish.rarity]||'✦'} ${fish.rarity.toUpperCase()} FISH!\n\n${fish.emoji} ${fish.name}\n"${fish.desc}"`);
  }, 300);
}

// ===================== TIMER =====================
function startTimer() { clearInterval(state.timerInterval); state.timerInterval=setInterval(tick,1000); }

function tick() {
  if (state.isPaused) return;
  state.slotSecondsLeft--;
  if (state.showOverall && state.isFocusPhase) state.overallSecondsLeft--;
  if (state.isFocusPhase) {
    state.focusElapsedSecs++;
    state.petGrowth = Math.min(100, state.petGrowth + (25/(30*60)));
  }
  updateTimerUI();
  if (state.slotSecondsLeft<=0) onPhaseEnd();
}

function onPhaseEnd() {
  const slot = state.slots[state.currentSlotIndex];
  if (state.isFocusPhase) {
    const incomplete = slot.tasks.filter(t=>!t.completed);
    if (incomplete.length>0) { state.incompleteQueue=[...incomplete]; showIncompletePrompt(); }
    else { setPetState('glowing'); setTimeout(()=>setPetState('normal'),5000); }
    state.isFocusPhase=false; slot.status='break';
    state.slotSecondsLeft=slot.breakSecs; state.focusTotalSecs=slot.breakSecs;
    updateTimerModeUI();
  } else {
    slot.status='done'; state.currentSlotIndex++;
    if (state.currentSlotIndex>=state.slots.length) { onSessionEnd(); return; }
    const next=state.slots[state.currentSlotIndex];
    next.status='focus'; state.isFocusPhase=true;
    state.slotSecondsLeft=next.focusSecs; state.focusTotalSecs=next.focusSecs;
    updateTimerModeUI();
    // Show colour picker on slot 4
    if (state.currentSlotIndex===3) showColourPicker();
    if (state.petGrowth>=100) onPetFullyGrown();
  }
  renderSlotsOverview(); renderCurrentSlotTasks(); updateTimerUI(); updateTankUI();
}

function onSessionEnd() {
  clearInterval(state.timerInterval); state.sessionActive=false;
  document.getElementById('main-timer').textContent='DONE! 🎉';
  document.getElementById('tama-status').textContent='session complete! ✨';
  if (state.petGrowth>=100) onPetFullyGrown();
  saveToStorage();
}

function togglePause() {
  state.isPaused=!state.isPaused;
  const btn=document.getElementById('btn-pause-resume');
  btn.textContent=state.isPaused?'▶ resume':'⏸ pause';
  document.getElementById('main-timer').classList.toggle('paused',state.isPaused);
}
function confirmStop() {
  if(confirm('Stop session? Progress is saved ✨')){ clearInterval(state.timerInterval); state.sessionActive=false; saveToStorage(); goToSetup(); }
}

// ===================== MAIN SCREEN =====================
function renderMainScreen() {
  document.getElementById('display-trainer-name').textContent =
    (state.currentUser?state.currentUser.name:'guest').toUpperCase();
  document.getElementById('tama-name-display').textContent = `🐠 ${state.petName||'my fish tank'}`;
  document.getElementById('overall-timer-row').style.display = state.showOverall?'flex':'none';
  updateTimerUI(); updateTimerModeUI();
  renderSlotsOverview(); renderCurrentSlotTasks();
  renderTank(); renderSavedPets();
  if (state.currentSlotIndex===3) showColourPicker();
}

function updateTimerUI() {
  document.getElementById('main-timer').textContent = formatTime(state.slotSecondsLeft);
  document.getElementById('overall-timer').textContent = formatTime(state.overallSecondsLeft);
  document.getElementById('slot-badge').textContent = `SLOT ${state.currentSlotIndex+1} / ${state.slots.length}`;
  const pct = state.focusTotalSecs>0?((state.focusTotalSecs-state.slotSecondsLeft)/state.focusTotalSecs)*100:0;
  const bar = document.getElementById('timer-bar');
  bar.style.width=`${pct}%`;
  bar.className='progress-fill'+(state.isFocusPhase?'':' break-fill');
  document.getElementById('tama-growth-pct').textContent=`${Math.round(state.petGrowth)}%`;
  document.getElementById('tama-growth-fill').style.width=`${state.petGrowth}%`;
}
function updateTimerModeUI() {
  const label=document.getElementById('timer-mode-label');
  const timer=document.getElementById('main-timer');
  label.textContent=state.isFocusPhase?'FOCUS ✨':'BREAK ☕';
  timer.className='timer-display'+(state.isFocusPhase?'':' break-mode');
}

function renderSlotsOverview() {
  document.getElementById('slots-overview-list').innerHTML = state.slots.map((slot,i)=>{
    const isActive=i===state.currentSlotIndex, isDone=slot.status==='done';
    let cls='slot-card'; if(isActive)cls+=' active-slot'; if(isDone)cls+=' done-slot';
    const tasks=slot.tasks.map(t=>{
      let tc='slot-task-mini'; if(t.completed)tc+=' done'; else if(isActive)tc+=' active';
      return `<div class="${tc}">▸ ${t.name}</div>`;
    }).join('')||'<div class="slot-task-mini">no tasks</div>';
    return `<div class="${cls}"><div class="slot-header"><span class="slot-num">SLOT ${i+1}</span><span class="slot-time">${slot.focusSecs/60}m / ${slot.breakSecs/60}m</span></div>${tasks}</div>`;
  }).join('');
}

function renderCurrentSlotTasks() {
  const ul=document.getElementById('current-slot-tasks');
  const allTasks=state.slots.flatMap((s,i)=>s.tasks.map(t=>({...t,slotIdx:i})));
  ul.innerHTML=allTasks.map(task=>{
    const isCurrent=task.slotIdx===state.currentSlotIndex;
    let cls='slot-task-item'; if(!isCurrent)cls+=' other-slot'; if(task.completed)cls+=' completed';
    return `<li class="${cls}" onclick="toggleTaskComplete('${task.id}')">
      <span>${task.completed?'✅':'⬜'}</span><span>${task.name}</span></li>`;
  }).join('');
}

function toggleTaskComplete(id) {
  state.slots.forEach(slot=>{
    const task=slot.tasks.find(t=>t.id===id);
    if(task&&!task.completed){ task.completed=true; const m=state.todos.find(t=>t.id===id); if(m)m.status='complete'; triggerConfetti(); }
  });
  const curSlot=state.slots[state.currentSlotIndex];
  if(curSlot&&curSlot.tasks.length>0&&curSlot.tasks.every(t=>t.completed)){ setPetState('glowing'); setTimeout(()=>setPetState('normal'),4000); }
  renderCurrentSlotTasks(); renderSlotsOverview(); updateTankUI(); saveToStorage();
}

// ===================== FISH TANK =====================
function renderTank() {
  const tank = document.getElementById('fish-tank');
  tank.innerHTML='';
  addBubbles(tank);
  if (!state.currentFish) return;
  const slot = state.currentSlotIndex;
  if (slot===0 || state.petGrowth<25) {
    renderEgg(tank);
  } else {
    renderFishInTank(tank);
  }
  // Snail every 3 fish
  if (state.snailCount>0) addTankCreature(tank,'snail','🐌','tank-snail');
  // Shrimp for rare+
  if (state.currentFish&&['rare','ultra-rare','legendary'].includes(state.currentFish.rarity)) addTankCreature(tank,'shrimp','🦐','tank-shrimp',{bottom:'40px',left:'20%'});
  // Crayfish for ultra-rare+
  if (state.currentFish&&['ultra-rare','legendary'].includes(state.currentFish.rarity)) addTankCreature(tank,'crayfish','🦞','tank-crayfish');
  updateTankAura();
}

function renderEgg(tank) {
  const colour = state.currentFish.colour;
  const egg=document.createElement('div');
  egg.className='fish-egg';
  egg.innerHTML=`<div class="egg-outer" style="background:${colour}20;border:3px solid ${colour}40">
    <div class="egg-inner" style="background:${colour}"></div></div>`;
  tank.appendChild(egg);
}

function renderFishInTank(tank) {
  const fish = state.currentFish;
  const colour = state.chosenColour || fish.colour;
  const size = state.petGrowth<50 ? 28 : state.petGrowth<75 ? 40 : 54;
  const yPos = 20 + Math.random()*30;
  const duration = 12 + Math.random()*8;
  const container=document.createElement('div');
  container.className='fish-container';
  container.style.cssText=`top:${yPos}%;animation-duration:${duration}s;`;
  container.innerHTML=drawPixelFish(colour, size);
  tank.appendChild(container);
}

function drawPixelFish(colour, size) {
  // CSS pixel art fish using box-shadow technique
  const s = Math.max(4, Math.round(size/12));
  return `<svg width="${size*2}" height="${size}" viewBox="0 0 ${size*2} ${size}" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- body -->
    <rect x="${size*0.3}" y="${size*0.2}" width="${size*0.8}" height="${size*0.6}" rx="${s}" fill="${colour}"/>
    <!-- tail -->
    <polygon points="${size*0.3},${size*0.2} ${size*0.05},${size*0.05} ${size*0.05},${size*0.95} ${size*0.3},${size*0.8}" fill="${colour}dd"/>
    <!-- belly highlight -->
    <ellipse cx="${size*0.65}" cy="${size*0.65}" rx="${size*0.2}" ry="${size*0.1}" fill="rgba(255,255,255,0.3)"/>
    <!-- eye -->
    <circle cx="${size*1.0}" cy="${size*0.38}" r="${s*1.2}" fill="white"/>
    <circle cx="${size*1.0}" cy="${size*0.38}" r="${s*0.7}" fill="#1a1a2e"/>
    <circle cx="${size*1.0+s*0.3}" cy="${size*0.38-s*0.3}" r="${s*0.3}" fill="white"/>
    <!-- fin -->
    <polygon points="${size*0.6},${size*0.2} ${size*0.7},${size*0.0} ${size*0.85},${size*0.2}" fill="${colour}cc"/>
    <!-- pixel sparkle if legendary -->
    ${state.currentFish&&state.currentFish.rarity==='legendary'?`<polygon points="${size*1.6},${size*0.05} ${size*1.65},${size*0.15} ${size*1.7},${size*0.05} ${size*1.65},${size*-0.05}" fill="#ffe066"/>`:'' }
  </svg>`;
}

function addTankCreature(tank, type, emoji, cls, style={}) {
  const el=document.createElement('div');
  el.className=cls;
  el.textContent=emoji;
  Object.assign(el.style, style);
  tank.appendChild(el);
}

function addBubbles(tank) {
  for(let i=0;i<6;i++){
    const b=document.createElement('div');
    b.className='bubble';
    const size=4+Math.random()*8;
    b.style.cssText=`width:${size}px;height:${size}px;left:${10+Math.random()*80}%;bottom:${Math.random()*40}%;animation-duration:${4+Math.random()*6}s;animation-delay:${Math.random()*4}s;`;
    tank.appendChild(b);
  }
}

function updateTankUI() {
  const fill=document.getElementById('tama-growth-fill');
  const pct=document.getElementById('tama-growth-pct');
  if(fill) fill.style.width=`${state.petGrowth}%`;
  if(pct) pct.textContent=`${Math.round(state.petGrowth)}%`;
  updateTankAura();
}

function updateTankAura() {
  const tank=document.getElementById('fish-tank');
  if(!tank) return;
  tank.style.boxShadow = state.petState==='glowing'
    ? 'inset 0 0 30px rgba(255,220,100,0.5), 0 0 30px rgba(255,220,100,0.4)'
    : state.petState==='damaged'
    ? 'inset 0 0 30px rgba(255,100,100,0.4), 0 0 20px rgba(255,100,100,0.3)'
    : 'inset 0 0 30px rgba(100,180,255,0.3), 0 4px 20px rgba(100,180,255,0.2)';
}

function setPetState(s) { state.petState=s; updateTankAura(); const el=document.getElementById('tama-status'); if(el){ el.textContent=s==='glowing'?'✨ glowing! all done!':s==='damaged'?'😟 feeling a bit sad...':'your fish is growing... 🐣'; } }

// Slot 4 colour picker
function showColourPicker() {
  const section=document.getElementById('colour-picker-section');
  if(!section) return;
  section.classList.remove('hidden');
  const row=document.getElementById('colour-picker-row');
  row.innerHTML=PASTEL_COLOURS.map(c=>`<div class="colour-swatch ${state.chosenColour===c?'active':''}" style="background:${c}" onclick="chooseFishColour('${c}')" title="${c}"></div>`).join('');
}
function chooseFishColour(c) {
  state.chosenColour=c;
  document.querySelectorAll('.colour-swatch').forEach(s=>s.classList.toggle('active',s.style.background===c||s.style.backgroundColor===c));
  renderTank(); saveToStorage();
}

function onPetFullyGrown() {
  state.savedPets.push({fish:state.currentFish, colour:state.chosenColour||state.currentFish.colour, name:state.petName});
  state.collectedFish.push(state.currentFish.id);
  state.snailCount++;
  renderSavedPets(); renderTank();
  document.getElementById('tama-status').textContent='🌟 fully grown! amazing!!';
  triggerConfetti();
  setTimeout(()=>alert(`🌟 ${state.currentFish.name} is fully grown!\n\nA new fish will be waiting for your next session!`),300);
  saveToStorage();
}

function renderSavedPets() {
  const row=document.getElementById('saved-pets-row');
  if(!row) return;
  row.innerHTML=state.savedPets.map((p,i)=>
    `<span class="saved-pet" title="${p.name} (${p.fish.name})" draggable="true">${p.fish.emoji}</span>`
  ).join('');
}

// ===================== FISH POKÉDEX =====================
function openFishDex() {
  pauseForModal();
  const grid=document.getElementById('dex-grid');
  grid.innerHTML=FISH_DB.map(f=>{
    const owned=state.collectedFish.includes(f.id);
    return `<div class="dex-card ${owned?'':'locked'}">
      <span class="dex-fish-emoji">${f.emoji}</span>
      <div class="dex-fish-name">${owned?f.name:'???'}</div>
      <div class="dex-rarity ${f.rarity}">${f.rarity}</div>
      ${owned?`<div style="font-size:9px;color:#9b7fe8;margin-top:3px;font-weight:700">"${f.desc}"</div>`:''}
    </div>`;
  }).join('');
  openModal('modal-fish-dex');
}

// ===================== INCOMPLETE TASK PROMPT =====================
function showIncompletePrompt() {
  if(!state.incompleteQueue.length) return;
  const task=state.incompleteQueue[0];
  document.getElementById('incomplete-task-msg').textContent=`"${task.name}" isn't done yet 😮 what do?`;
  const opts=document.getElementById('incomplete-task-options');
  const future=state.slots.slice(state.currentSlotIndex+1);
  let html=future.map((slot,i)=>`<button class="y2k-btn blue small" onclick="shiftTask('${task.id}',${slot.id})">▶ move to slot ${state.currentSlotIndex+2+i}</button>`).join('');
  html+=`<button class="y2k-btn small mint" onclick="extendSession('${task.id}')">⏱ extend overall time</button>`;
  html+=`<button class="y2k-btn small danger" onclick="skipTask('${task.id}')">✕ skip task</button>`;
  opts.innerHTML=html;
  openModal('modal-incomplete-task');
}
function shiftTask(taskId,targetSlotId) {
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  const ts=state.slots.find(s=>s.id===targetSlotId);
  const mt=state.todos.find(t=>t.id===taskId);
  if(ts&&mt){ts.tasks.push({...mt});mt.slotAssignment=targetSlotId;}
  closeModal('modal-incomplete-task'); nextIncomplete();
  renderCurrentSlotTasks(); renderSlotsOverview(); saveToStorage();
}
function extendSession(taskId) {
  const extra=parseInt(prompt('Add how many minutes?','30'))||30;
  state.overallSecondsLeft+=extra*60; state.totalMinutes+=extra;
  const ns={id:state.slots.length+1,focusSecs:state.focusMinutes*60,breakSecs:state.breakMinutes*60,tasks:[],status:'pending'};
  const mt=state.todos.find(t=>t.id===taskId);
  if(mt) ns.tasks.push({...mt});
  state.slots.push(ns);
  state.slots.forEach(s=>{if(s.id!==ns.id)s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  closeModal('modal-incomplete-task'); nextIncomplete();
  renderSlotsOverview(); renderCurrentSlotTasks(); saveToStorage();
}
function skipTask(taskId) {
  const mt=state.todos.find(t=>t.id===taskId);
  if(mt) mt.status='skipped';
  const li=document.createElement('li'); li.textContent=mt?mt.name:taskId;
  document.getElementById('skipped-list').appendChild(li);
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  setPetState('damaged'); setTimeout(()=>setPetState('normal'),6000);
  closeModal('modal-incomplete-task'); nextIncomplete();
  renderCurrentSlotTasks(); saveToStorage();
}
function nextIncomplete() { state.incompleteQueue.shift(); if(state.incompleteQueue.length>0) showIncompletePrompt(); }

// ===================== TODO =====================
function openTodoOverlay() {
  pauseForModal();
  renderTodoOverlay();
  openModal('todo-overlay');
}
function renderTodoPage() {
  const c=document.getElementById('todo-list-container');
  let tasks=[...state.todos];
  if(state.todoFilter!=='all') tasks=tasks.filter(t=>t.status===state.todoFilter);
  const pMap={high:0,medium:1,low:2};
  const sMap={'not-started':0,'in-progress':1,complete:2,skipped:3};
  if(state.todoSort==='due') tasks.sort((a,b)=>(a.due||'9999')<(b.due||'9999')?-1:1);
  else if(state.todoSort==='priority') tasks.sort((a,b)=>(pMap[a.priority]||1)-(pMap[b.priority]||1));
  else if(state.todoSort==='status') tasks.sort((a,b)=>(sMap[a.status]||0)-(sMap[b.status]||0));
  if(!tasks.length){c.innerHTML='<div style="background:white;border-radius:10px;padding:16px;border:1.5px solid #ede0ff"><p class="hint-text">No tasks yet! Hit + add task ✨</p></div>';return;}
  c.innerHTML=tasks.map(t=>{
    const sel=state.selectedTodoIds.includes(t.id);
    return `<div class="todo-card ${sel?'selected':''}" onclick="toggleTodoSelect('${t.id}')">
      <span style="font-size:18px;flex-shrink:0">${t.status==='complete'?'✅':'⬜'}</span>
      <div class="todo-card-body">
        <div class="todo-card-name ${t.status==='complete'?'done':''}">${t.name}</div>
        <div class="todo-card-meta">
          <span class="badge ${t.priority}">${t.priority}</span>
          <span class="badge ${t.status}">${formatStatus(t.status)}</span>
          ${t.due?`<span class="due-badge">📅 ${t.due}</span>`:''}
        </div>
      </div>
      <div class="todo-card-actions">
        <button class="y2k-btn tiny" onclick="event.stopPropagation();openEditStatus('${t.id}')">status</button>
        <button class="y2k-btn tiny danger" onclick="event.stopPropagation();deleteTask('${t.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}
function overlayAddTask() {
  const name = document.getElementById('overlay-new-task-name').value.trim();
  if (!name) return;
  const task = {
    id: 'task_'+Date.now(), name,
    due: document.getElementById('overlay-new-task-due').value,
    priority: document.getElementById('overlay-new-task-priority').value,
    status: 'not-started', slotAssignment: null, completed: false,
  };
  state.todos.push(task);
  document.getElementById('overlay-new-task-name').value='';
  renderTodoOverlay(); saveToStorage();
}

function filterTodoOverlay(f) { state.todoFilter=f; renderTodoOverlay(); }

function renderTodoOverlay() {
  const slotOpts=state.slots.map((s,i)=>`<option value="${s.id}">slot ${i+1}</option>`).join('');
  let tasks=[...state.todos];
  if(state.todoFilter!=='all') tasks=tasks.filter(t=>t.status===state.todoFilter);
  const pMap={high:0,medium:1,low:2};
  if(state.todoSort==='due') tasks.sort((a,b)=>(a.due||'9999')<(b.due||'9999')?-1:1);
  else if(state.todoSort==='priority') tasks.sort((a,b)=>(pMap[a.priority]||1)-(pMap[b.priority]||1));

  document.getElementById('todo-overlay-list').innerHTML = tasks.length
    ? tasks.map(t=>{
        const sel=state.selectedTodoIds.includes(t.id);
        const done=t.status==='complete';
        return `<div class="overlay-task ${sel?'selected':''}" onclick="toggleTodoSelect('${t.id}');renderTodoOverlay()">
          <span>${sel?'☑':'☐'}</span>
          <span class="overlay-task-name" style="${done?'text-decoration:line-through;opacity:0.5':''}">${t.name}</span>
          <span class="badge ${t.priority}" style="flex-shrink:0">${t.priority}</span>
          ${t.due?`<span class="due-badge" style="flex-shrink:0">📅 ${t.due}</span>`:''}
          <select class="overlay-select" id="ol-target-${t.id}" onclick="event.stopPropagation()">
            <option value="overall">overall</option>${slotOpts}
          </select>
          <button class="y2k-btn tiny danger" onclick="event.stopPropagation();deleteTask('${t.id}');renderTodoOverlay()">✕</button>
        </div>`;
      }).join('')
    : '<p class="hint-text">No tasks! Add one above ✨</p>';
}
function addOverlayTasksToSession() {
  state.selectedTodoIds.forEach(id=>{
    const sel=document.getElementById(`ol-target-${id}`);
    if(!sel) return;
    const target=sel.value; const mt=state.todos.find(t=>t.id===id); if(!mt) return;
    mt.slotAssignment=target==='overall'?'overall':parseInt(target);
    if(target!=='overall'){const s=state.slots.find(s=>s.id===parseInt(target));if(s&&!s.tasks.find(t=>t.id===id))s.tasks.push({...mt});}
    else if(state.slots[state.currentSlotIndex]){const s=state.slots[state.currentSlotIndex];if(!s.tasks.find(t=>t.id===id))s.tasks.push({...mt});}
  });
  state.selectedTodoIds=[];
  closeModalAndResume('todo-overlay'); renderCurrentSlotTasks(); renderSlotsOverview(); saveToStorage();
}
function toggleTodoSelect(id) {
  const i=state.selectedTodoIds.indexOf(id);
  if(i===-1)state.selectedTodoIds.push(id); else state.selectedTodoIds.splice(i,1);
  if(document.getElementById('screen-todo').classList.contains('active')) renderTodoPage();
  else renderTodoOverlay();
}
function moveSelectedToMain(){ if(!state.selectedTodoIds.length){alert('Select tasks first!');return;} goToSetup(); }
function sortTodo(by){state.todoSort=by;renderTodoPage();}
function filterTodo(f){
  state.todoFilter=f;
  document.querySelectorAll('[id^="filter-"]').forEach(b=>b.classList.remove('active-filter'));
  document.getElementById(`filter-${f}`)?.classList.add('active-filter');
  renderTodoPage();
}
function openAddTask(){
  document.getElementById('task-name-input').value='';
  document.getElementById('task-due-input').value='';
  document.getElementById('task-priority-input').value='medium';
  openModal('modal-add-task');
}
function saveTask(){
  const name=document.getElementById('task-name-input').value.trim();
  if(!name){alert('Name your task! ✨');return;}
  state.todos.push({id:'task_'+Date.now(),name,due:document.getElementById('task-due-input').value,priority:document.getElementById('task-priority-input').value,status:'not-started',slotAssignment:null,completed:false});
  closeModal('modal-add-task'); renderTodoPage(); saveToStorage();
}
function deleteTask(id){
  if(!confirm('Delete this task? 🗑️'))return;
  state.todos=state.todos.filter(t=>t.id!==id);
  state.slots.forEach(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});
  renderTodoPage(); saveToStorage();
}
function openEditStatus(id){
  const t=state.todos.find(t=>t.id===id); if(!t)return;
  const statuses=['not-started','in-progress','complete','skipped'];
  const c=prompt(`Change status for "${t.name}"\nOptions: ${statuses.join(', ')}`,t.status);
  if(c&&statuses.includes(c)){t.status=c;if(c==='complete')t.completed=true;renderTodoPage();saveToStorage();}
}

// ===================== MODAL PAUSE HELPERS =====================
function pauseForModal() {
  if (state.sessionActive && !state.isPaused) {
    state._pausedForModal = true;
    state.isPaused = true;
  }
}
function resumeAfterModal() {
  if (state._pausedForModal) {
    state._pausedForModal = false;
    state.isPaused = false;
  }
}
function closeModalAndResume(id) {
  closeModal(id);
  resumeAfterModal();
}

// ===================== ACCOUNT MODAL =====================
function openAccountModal() {
  pauseForModal();
  const body = document.getElementById('account-modal-body');
  if (!state.currentUser) {
    body.innerHTML = `
      <p class="hint-text">You're playing as a guest — sign in to save progress! ✨</p>
      <div class="field-group">
        <label class="y2k-label">EMAIL</label>
        <input type="email" id="acc-login-email" class="y2k-input" placeholder="trainer@email.com"/>
      </div>
      <div class="field-group">
        <label class="y2k-label">PASSWORD</label>
        <input type="password" id="acc-login-pass" class="y2k-input" placeholder="••••••••"/>
      </div>
      <div class="modal-btns">
        <button class="y2k-btn filled-purple" onclick="accountSignIn()">▶ sign in</button>
        <button class="y2k-btn" onclick="closeModalAndResume('modal-account')">cancel</button>
      </div>
      <p class="auth-error" id="acc-login-error"></p>`;
  } else {
    const users = getUsers();
    const created = users[state.currentUser.email]?.created || 'a while ago';
    body.innerHTML = `
      <div class="account-info-row">
        <span class="account-info-label">TRAINER NAME</span>
        <span class="account-info-value">✨ ${state.currentUser.name}</span>
      </div>
      <div class="account-info-row">
        <span class="account-info-label">EMAIL</span>
        <span class="account-info-value">${state.currentUser.email}</span>
      </div>
      <div class="account-info-row">
        <span class="account-info-label">FISH COLLECTED</span>
        <span class="account-info-value">🐠 ${state.collectedFish.length} / ${FISH_DB.length}</span>
      </div>
      <div class="account-info-row">
        <span class="account-info-label">SAVED PETS</span>
        <span class="account-info-value">🌟 ${state.savedPets.length} fully grown</span>
      </div>
      <div class="modal-btns" style="margin-top:4px">
        <button class="y2k-btn danger small" onclick="handleLogout()">⏏ log out</button>
        <button class="y2k-btn danger small" onclick="deleteAccount()">🗑 delete account</button>
        <button class="y2k-btn small" onclick="closeModalAndResume('modal-account')">close</button>
      </div>`;
  }
  openModal('modal-account');
}

function accountSignIn() {
  const email = document.getElementById('acc-login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('acc-login-pass').value;
  const err   = document.getElementById('acc-login-error');
  const users = getUsers();
  if (!users[email] || users[email].password !== btoa(pass)) { err.textContent='⚠ wrong email or password'; return; }
  saveToStorage(); // save guest progress
  state.currentUser = {email, name: users[email].name};
  loadFromStorage();
  closeModalAndResume('modal-account');
  document.getElementById('display-trainer-name').textContent = state.currentUser.name.toUpperCase();
}

function deleteAccount() {
  if (!confirm('Delete your account? This cannot be undone!! 😱')) return;
  const users = getUsers();
  delete users[state.currentUser.email];
  saveUsers(users);
  localStorage.removeItem(`pomogotchi_${state.currentUser.email}`);
  state.currentUser = null;
  closeModal('modal-account');
  clearInterval(state.timerInterval);
  state.sessionActive = false;
  showScreen('screen-auth');
}

// ===================== INLINE ADD TASK =====================
function inlineAddTask() {
  const input = document.getElementById('inline-task-input');
  const name  = input.value.trim();
  if (!name) return;
  const task = {
    id: 'task_' + Date.now(), name,
    due: '', priority: 'medium',
    status: 'not-started', slotAssignment: null, completed: false,
  };
  state.todos.push(task);
  // Add to current slot directly
  const slot = state.slots[state.currentSlotIndex];
  if (slot) slot.tasks.push({...task});
  input.value = '';
  renderCurrentSlotTasks();
  renderSlotsOverview();
  saveToStorage();
}


function openSettings(){ pauseForModal(); openModal('modal-settings'); }
function setBg(c){
  state.bgColour=c; document.body.style.background=c;
  document.querySelectorAll('.bg-swatch').forEach(s=>{
    const sc=s.style.background||s.style.backgroundColor;
    s.classList.toggle('active', sc===c);
  });
  saveToStorage();
}

// ===================== CONFETTI =====================
function triggerConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const colours=['#ffb3d9','#c9b3ff','#a8d8ff','#b3f0e0','#fff0a8','#ffd4b3','#ff80bf'];
  const pieces=Array.from({length:100},()=>({
    x:Math.random()*canvas.width, y:-10,
    r:Math.random()*6+3, d:Math.random()*2+2,
    colour:colours[Math.floor(Math.random()*colours.length)],
    tilt:Math.random()*10-5, tiltA:0,
  }));
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      ctx.beginPath(); ctx.lineWidth=p.r; ctx.strokeStyle=p.colour;
      ctx.moveTo(p.x+p.tilt,p.y); ctx.lineTo(p.x,p.y+p.tilt+p.r/2); ctx.stroke();
      p.y+=p.d+1; p.tiltA+=0.1; p.tilt=Math.sin(p.tiltA)*12;
    });
    frame++;
    if(frame<150) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

// ===================== MODAL HELPERS =====================
function openModal(id){document.getElementById(id).classList.remove('hidden');}
function closeModal(id){document.getElementById(id).classList.add('hidden');}

// ===================== UTILS =====================
function formatTime(s){
  if(s<0)s=0;
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return h>0?`${pad(h)}:${pad(m)}:${pad(sec)}`:`${pad(m)}:${pad(sec)}`;
}
function pad(n){return String(n).padStart(2,'0');}
function formatStatus(s){return({'not-started':'not started','in-progress':'in progress',complete:'complete ✓',skipped:'skipped'})[s]||s;}

// ===================== BOOT =====================
window.addEventListener('DOMContentLoaded',()=>{
  document.body.style.background = state.bgColour;
  showScreen('screen-auth');
  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{
      if(e.target===o){ closeModal(o.id); resumeAfterModal(); }
    });
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&state.sessionActive&&document.activeElement.tagName!=='INPUT'){
      e.preventDefault(); togglePause();
    }
    if(e.code==='Enter'&&document.activeElement.id==='inline-task-input') inlineAddTask();
    if(e.code==='Enter'&&document.activeElement.id==='overlay-new-task-name') overlayAddTask();
  });
});
