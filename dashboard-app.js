/* ============================================================
   TEACHER DASHBOARD — APPLICATION LOGIC
   ============================================================ */

const GOOGLE_CLIENT_ID = '487495658772-eck3r6d7s9in7sdc87h6knov95tr4v42.apps.googleusercontent.com';
// Teacher email allowlist — also defined in auth-service.js TEACHER_EMAILS
const DASHBOARD_TEACHER_EMAILS = ['amanda.shammel@hpln.ca','admin@hpln.ca','amanda.yaremchuk@gmail.com','amandahammel@prrd8.ca','coreysteeves@prrd8.ca'];
let currentSort = { col:'name', asc:true };

// ===== AUTH (uses auth-guard.js) =====
document.addEventListener('DOMContentLoaded', () => {
  // Date
  const d = new Date();
  const el = document.getElementById('dashDate');
  if(el) el.textContent = d.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  // Theme
  if(localStorage.getItem('g7-theme')==='light') document.body.classList.add('light');
  const tb = document.getElementById('dashThemeBtn');
  if(tb) tb.textContent = document.body.classList.contains('light') ? '🌙 Dark' : '☀️ Light';

  // Initialize Firebase (runs in offline mode if not configured)
  if (typeof initFirebase === 'function') initFirebase();
  if (typeof initAuthService === 'function') initAuthService();

  // Use auth guard to protect this page — requires teacher role
  if (typeof guardPage === 'function') {
    guardPage({
      requiredRole: 'teacher',
      contentId: 'dashMain',
      gateId: 'authGate',
      onAuthorized: function(name, email, avatar) {
        showDashboard(name, email, avatar);
      },
      allowManualCode: true,
      manualCode: 'hpln2025'
    });
  } else {
    // Fallback if auth-guard.js didn't load
    _legacyAuthCheck();
  }

  // Also init GIS button for the auth gate
  initTeacherGSI();
});

// manualTeacherLogin is defined below (line ~129) with guardManualLogin support

function _legacyAuthCheck() {
  const tName = localStorage.getItem('g7-teacher-name');
  const tEmail = localStorage.getItem('g7-teacher-email');
  if(tName && tEmail) { showDashboard(tName, tEmail, localStorage.getItem('g7-teacher-avatar')||''); }
  else { document.getElementById('authGate').style.display='flex'; }
}

function initTeacherGSI(){
  const btn = document.getElementById('teacherGoogleBtn');
  if(!btn) return;
  if(window.location.protocol==='file:') { btn.innerHTML='<p style="color:var(--text3);font-size:.8rem">Google Sign-In requires http/https</p>'; return; }

  // GIS loads async — retry until the library is available
  let attempts = 0;
  const tryInit = () => {
    attempts++;
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      // Step 1: Initialize GIS (must happen before renderButton)
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleTeacherCred,
          auto_select: false
        });
      } catch(e) { console.warn('GIS init error:', e); }
      // Step 2: Wait a tick, then render the button
      setTimeout(() => {
        try {
          google.accounts.id.renderButton(btn, {
            theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 280
          });
        } catch(e) {
          btn.innerHTML = '<p style="color:var(--text3);font-size:.8rem">Google Sign-In unavailable. Use the access code.</p>';
        }
      }, 200);
    } else if (attempts < 20) {
      setTimeout(tryInit, 500);
    } else {
      btn.innerHTML='<p style="color:var(--text3);font-size:.8rem">Google Sign-In unavailable. Use the access code below.</p>';
    }
  };
  tryInit();
}

function handleTeacherCred(resp){
  try {
    const b = resp.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const p = JSON.parse(decodeURIComponent(atob(b).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    if(!p.email){ alert('Sign-in failed'); return; }
    // Check if email is a teacher
    if (!DASHBOARD_TEACHER_EMAILS.some(e => e.toLowerCase() === p.email.toLowerCase())) {
      // Not a recognized teacher — check Firestore role if available
      if (typeof getUserRole === 'function' && (getUserRole() === 'teacher' || getUserRole() === 'admin')) {
        // Firestore says they're a teacher, allow
      } else {
        alert('⚠️ This account does not have teacher access. Please sign in with your teacher account.');
        return;
      }
    }
    localStorage.setItem('g7-teacher-name', p.name||p.email.split('@')[0]);
    localStorage.setItem('g7-teacher-email', p.email);
    localStorage.setItem('g7-teacher-avatar', p.picture||'');
    localStorage.setItem('g7-teacher-unlock','true');
    showDashboard(p.name, p.email, p.picture||'');
  } catch(e){ alert('Authentication error'); }
}

function manualTeacherLogin(){
  const code = prompt('Enter teacher access code:');
  if(!code) return;
  if (typeof guardManualLogin === 'function') {
    guardManualLogin(code);
    return;
  }
  // Legacy fallback
  if(code==='hpln2025'){
    const name = prompt('Enter your name:') || 'Teacher';
    localStorage.setItem('g7-teacher-name', name);
    localStorage.setItem('g7-teacher-email', 'teacher@hpln.ca');
    localStorage.setItem('g7-teacher-avatar','');
    localStorage.setItem('g7-teacher-unlock','true');
    showDashboard(name, 'teacher@hpln.ca', '');
  } else { alert('Invalid code'); }
}

function teacherSignOut(){
  if(!confirm('Sign out of the dashboard?')) return;
  localStorage.removeItem('g7-teacher-name');
  localStorage.removeItem('g7-teacher-email');
  localStorage.removeItem('g7-teacher-avatar');
  localStorage.removeItem('g7-teacher-unlock');
  // Sign out of Firebase Auth if available
  if (typeof signOut === 'function') { try { signOut(); } catch(e){} }
  try { if(typeof google!=='undefined'&&google.accounts) google.accounts.id.disableAutoSelect(); } catch(e){}
  location.reload();
}

function showDashboard(name, email, avatar){
  document.getElementById('authGate').style.display='none';
  document.getElementById('dashMain').style.display='flex';
  const u = document.getElementById('dashUser');
  if(u) u.innerHTML = (avatar?'<img src="'+avatar+'" alt="">':'') + '<span>'+name.split(' ')[0]+'</span>';
  renderAll();
}

function toggleTheme(){
  document.body.classList.toggle('light');
  localStorage.setItem('g7-theme', document.body.classList.contains('light')?'light':'dark');
  const tb = document.getElementById('dashThemeBtn');
  if(tb) tb.textContent = document.body.classList.contains('light') ? '🌙 Dark' : '☀️ Light';
}

function toggleDashSidebar(){
  document.getElementById('dashSidebar').classList.toggle('open');
}

// ===== NAVIGATION =====
function showSection(id){
  document.querySelectorAll('.dash-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.dash-nav-item').forEach(n=>n.classList.remove('active'));
  const sec = document.getElementById('sec-'+id);
  if(sec) sec.classList.add('active');
  const nav = document.querySelector('[data-section="'+id+'"]');
  if(nav) nav.classList.add('active');
  const titles = {overview:'Overview',students:'Student Progress',attention:'Needs Attention',analytics:'Lesson Analytics',mastery:'Mastery Tracking',submissions:'Submissions',notes:'Teacher Notes',pacing:'Pacing Monitor'};
  document.getElementById('sectionTitle').textContent = titles[id]||id;
  // Close sidebar on mobile
  document.getElementById('dashSidebar').classList.remove('open');
}

// ===== RENDER ALL =====
function renderAll(){
  renderKPIs();
  renderQuickAlerts();
  renderCelebrate();
  renderUnitProgress();
  renderStudentTable();
  renderAttention();
  renderAnalytics();
  renderMastery();
  renderSubmissions();
  renderNotes();
  renderPacing();
}

// ===== SECTION 1: KPIs =====
function renderKPIs(){
  const students = MOCK_STUDENTS;
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = daysAgo(7);
  const activeToday = students.filter(s=>s.lastActive===today).length;
  const activeWeek = students.filter(s=>s.lastActive>=weekAgo).length;
  const inactive7 = students.filter(s=>s.lastActive<weekAgo).length;
  const avgProgress = Math.round(students.reduce((a,s)=>a+s.progress,0)/students.length);
  const avgScore = Math.round(students.reduce((a,s)=>a+s.avgScore,0)/students.length);
  const needsAttention = students.filter(s=>s.alerts.length>0).length;
  const unitCounts = {};
  students.forEach(s=>{ unitCounts[s.unit]=(unitCounts[s.unit]||0)+1; });
  const mostActive = Object.entries(unitCounts).sort((a,b)=>b[1]-a[1])[0];

  const kpis = [
    {icon:'👥',val:students.length,label:'Total Students'},
    {icon:'🟢',val:activeToday,label:'Active Today'},
    {icon:'📅',val:activeWeek,label:'Active This Week'},
    {icon:'⚠️',val:inactive7,label:'Inactive 7+ Days'},
    {icon:'📊',val:avgProgress+'%',label:'Avg Progress'},
    {icon:'🎯',val:avgScore+'%',label:'Avg Score'},
    {icon:'🚨',val:needsAttention,label:'Need Attention'},
    {icon:'🔥',val:'Unit '+(mostActive?mostActive[0]:'—'),label:'Most Active'}
  ];

  document.getElementById('kpiGrid').innerHTML = kpis.map(k=>
    '<div class="kpi-card"><div class="kpi-icon">'+k.icon+'</div><div class="kpi-val">'+k.val+'</div><div class="kpi-label">'+k.label+'</div></div>'
  ).join('');

  document.getElementById('attentionBadge').textContent = needsAttention;
}

// ===== QUICK ALERTS =====
function renderQuickAlerts(){
  const flagged = MOCK_STUDENTS.filter(s=>s.alerts.length>0).slice(0,5);
  if(!flagged.length){ document.getElementById('quickAlerts').innerHTML='<p style="color:var(--text3);font-size:.85rem;text-align:center;padding:20px">✅ No urgent issues right now</p>'; return; }
  document.getElementById('quickAlerts').innerHTML = flagged.map(s=>
    '<div class="attention-card '+(s.status==='Stuck'?'urgent':'warning')+'" onclick="openProfile('+s.id+')">'+
    '<div class="attention-icon">'+(s.status==='Stuck'?'🔴':'🟡')+'</div>'+
    '<div class="attention-info"><div class="attention-name">'+s.name+'</div><div class="attention-detail">'+s.alerts.join(' · ')+'</div></div>'+
    '<div class="attention-actions"><button class="attention-btn" onclick="event.stopPropagation();openProfile('+s.id+')">View</button></div></div>'
  ).join('');
}

// ===== CELEBRATE =====
function renderCelebrate(){
  const stars = MOCK_STUDENTS.filter(s=>s.avgScore>=85&&s.status!=='Stuck').sort((a,b)=>b.avgScore-a.avgScore).slice(0,4);
  document.getElementById('celebrateList').innerHTML = stars.map(s=>
    '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'+
    '<span style="font-size:1.1rem">⭐</span>'+
    '<div style="flex:1"><div style="font-weight:600;font-size:.85rem;color:var(--text)">'+s.name+'</div>'+
    '<div style="font-size:.72rem;color:var(--text3)">'+s.avgScore+'% avg · Unit '+s.unit+'</div></div></div>'
  ).join('');
}

// ===== UNIT PROGRESS BARS =====
function renderUnitProgress(){
  const html = UNITS.map(u=>{
    const inUnit = MOCK_STUDENTS.filter(s=>s.unitProgress[u.id]>0);
    const avg = inUnit.length ? Math.round(inUnit.reduce((a,s)=>a+s.unitProgress[u.id],0)/MOCK_STUDENTS.length) : 0;
    return '<div class="bar-row"><div class="bar-label">'+u.icon+' Unit '+u.id+'</div><div class="bar-track"><div class="bar-fill" style="width:'+avg+'%;background:linear-gradient(90deg,var(--accent),var(--accent2))">'+avg+'%</div></div></div>';
  }).join('');
  document.getElementById('unitProgressBars').innerHTML = html;
}

// ===== SECTION 2: STUDENT TABLE =====
function renderStudentTable(){
  const tbody = document.getElementById('studentTableBody');
  let students = [...MOCK_STUDENTS];
  // Search
  const q = (document.getElementById('studentSearch').value||'').toLowerCase();
  if(q) students = students.filter(s=>s.name.toLowerCase().includes(q)||s.email.toLowerCase().includes(q));
  // Filters
  const fu = document.getElementById('filterUnit').value;
  if(fu) students = students.filter(s=>s.unit===fu);
  const fs = document.getElementById('filterStatus').value;
  if(fs) students = students.filter(s=>s.status===fs);
  // Sort
  students.sort((a,b)=>{
    let va=a[currentSort.col], vb=b[currentSort.col];
    if(currentSort.col==='name') { va=a.name.toLowerCase(); vb=b.name.toLowerCase(); }
    if(currentSort.col==='lesson') { va=a.lesson; vb=b.lesson; }
    if(typeof va==='string') return currentSort.asc?va.localeCompare(vb):vb.localeCompare(va);
    return currentSort.asc?va-vb:vb-va;
  });

  tbody.innerHTML = students.map(s=>{
    const statusClass = 'status-'+s.status.toLowerCase().replace(/\s/g,'-');
    const daysSince = Math.floor((Date.now()-new Date(s.lastActive).getTime())/86400000);
    const lastLabel = daysSince===0?'Today':daysSince===1?'Yesterday':daysSince+' days ago';
    return '<tr onclick="openProfile('+s.id+')">'+
      '<td style="font-weight:600;color:var(--text)">'+s.name+'</td>'+
      '<td>Unit '+s.unit+'</td>'+
      '<td>L'+s.lesson+'</td>'+
      '<td><span class="mini-progress"><span class="mini-progress-fill" style="width:'+s.progress+'%"></span></span>'+s.progress+'%</td>'+
      '<td>'+s.avgScore+'%</td>'+
      '<td style="color:'+(daysSince>=7?'var(--danger)':'var(--text3)')+'">'+lastLabel+'</td>'+
      '<td><span class="status-chip '+statusClass+'">'+s.status+'</span></td>'+
      '<td>'+(s.alerts.length?'<span style="color:var(--danger);font-weight:700">'+s.alerts.length+'</span>':'—')+'</td>'+
    '</tr>';
  }).join('');
}

function filterStudents(){ renderStudentTable(); }
function sortTable(col){ if(currentSort.col===col) currentSort.asc=!currentSort.asc; else { currentSort.col=col; currentSort.asc=true; } renderStudentTable(); }

// ===== SECTION 3: ATTENTION =====
function renderAttention(){
  const flagged = MOCK_STUDENTS.filter(s=>s.alerts.length>0);
  if(!flagged.length){ document.getElementById('attentionList').innerHTML='<div style="text-align:center;padding:60px;color:var(--text3)"><div style="font-size:3rem;margin-bottom:12px">✅</div><h3>All Clear</h3><p>No students need immediate attention right now.</p></div>'; return; }
  document.getElementById('attentionList').innerHTML = flagged.map(s=>
    '<div class="attention-card '+(s.status==='Stuck'?'urgent':'warning')+'">'+
    '<div class="attention-icon">'+(s.status==='Stuck'?'🔴':'🟡')+'</div>'+
    '<div class="attention-info"><div class="attention-name">'+s.name+'</div><div class="attention-detail">'+s.alerts.join(' · ')+'</div>'+
    '<div style="font-size:.72rem;color:var(--text3);margin-top:4px">Unit '+s.unit+' · L'+s.lesson+' · '+s.avgScore+'% avg · Last active: '+s.lastActive+'</div></div>'+
    '<div class="attention-actions">'+
    '<button class="attention-btn" onclick="openProfile('+s.id+')">👤 View</button>'+
    '<button class="attention-btn" onclick="addNoteFor('+s.id+')">📋 Note</button>'+
    '<button class="attention-btn" onclick="alert(\'Reminder sent to '+s.name+'\')">📧 Remind</button></div></div>'
  ).join('');
}

// ===== SECTION 4: ANALYTICS =====
function renderAnalytics(){
  const grid = document.getElementById('analyticsGrid');
  // Completion rates by lesson
  let completionHTML = '<div class="analytics-card"><h3>📊 Completion Rate by Lesson</h3><div class="bar-chart">';
  LESSON_ANALYTICS.forEach(la=>{
    const pct = Math.round(la.completed/la.opened*100);
    completionHTML += '<div class="bar-row"><div class="bar-label">'+la.unit+'-L'+la.lesson+'</div><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:linear-gradient(90deg,#4ade80,#22c55e)">'+pct+'%</div></div></div>';
  });
  completionHTML += '</div></div>';

  // Average scores
  let scoreHTML = '<div class="analytics-card"><h3>🎯 Average Quiz Score by Lesson</h3><div class="bar-chart">';
  LESSON_ANALYTICS.forEach(la=>{
    const color = la.avgScore>=80?'#4ade80':la.avgScore>=65?'#fbbf24':'#ef4444';
    scoreHTML += '<div class="bar-row"><div class="bar-label">'+la.unit+'-L'+la.lesson+'</div><div class="bar-track"><div class="bar-fill" style="width:'+la.avgScore+'%;background:'+color+'">'+la.avgScore+'%</div></div></div>';
  });
  scoreHTML += '</div></div>';

  // Retry rates
  let retryHTML = '<div class="analytics-card"><h3>🔄 Quiz Retry Rate</h3><div class="bar-chart">';
  LESSON_ANALYTICS.forEach(la=>{
    const color = la.retryRate>=40?'#ef4444':la.retryRate>=25?'#fbbf24':'#4ade80';
    retryHTML += '<div class="bar-row"><div class="bar-label">'+la.unit+'-L'+la.lesson+'</div><div class="bar-track"><div class="bar-fill" style="width:'+la.retryRate+'%;background:'+color+'">'+la.retryRate+'%</div></div></div>';
  });
  retryHTML += '</div></div>';

  // Most missed questions
  let missedHTML = '<div class="analytics-card"><h3>❌ Most Missed Questions</h3><div style="display:flex;flex-direction:column;gap:8px">';
  LESSON_ANALYTICS.filter(la=>la.retryRate>=25).sort((a,b)=>b.retryRate-a.retryRate).forEach(la=>{
    missedHTML += '<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--card2);border-radius:8px">'+
      '<span class="status-chip status-stuck" style="flex-shrink:0">'+la.unit+'-L'+la.lesson+'</span>'+
      '<span style="font-size:.82rem;color:var(--text2)">'+la.missedQ+'</span>'+
      '<span style="margin-left:auto;font-size:.75rem;color:var(--danger);font-weight:600">'+la.retryRate+'%</span></div>';
  });
  missedHTML += '</div></div>';

  grid.innerHTML = completionHTML + scoreHTML + retryHTML + missedHTML;
}

// ===== SECTION 5: MASTERY =====
function renderMastery(){
  const allOutcomes = UNITS.flatMap(u=>u.outcomes);
  let html = '<div class="dash-card"><h3 class="dash-card-title">🎯 Class Mastery Overview</h3>';
  // Summary bars
  const totalPossible = MOCK_STUDENTS.length * allOutcomes.length;
  const totalMastered = MOCK_STUDENTS.reduce((a,s)=>a+s.outcomes.mastered.length,0);
  const totalDeveloping = MOCK_STUDENTS.reduce((a,s)=>a+s.outcomes.developing.length,0);
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">'+
    '<div class="profile-stat"><div class="profile-stat-val" style="color:#4ade80">'+Math.round(totalMastered/totalPossible*100)+'%</div><div class="profile-stat-lbl">Mastered</div></div>'+
    '<div class="profile-stat"><div class="profile-stat-val" style="color:#fbbf24">'+Math.round(totalDeveloping/totalPossible*100)+'%</div><div class="profile-stat-lbl">Developing</div></div>'+
    '<div class="profile-stat"><div class="profile-stat-val" style="color:var(--text3)">'+Math.round((totalPossible-totalMastered-totalDeveloping)/totalPossible*100)+'%</div><div class="profile-stat-lbl">Not Started</div></div></div>';

  // Per-student mastery table
  html += '<div class="data-table-wrap"><table class="mastery-table"><thead><tr><th>Student</th>';
  allOutcomes.forEach(o=>{ html+='<th style="font-size:.6rem;writing-mode:vertical-lr;text-align:center;padding:8px 4px">'+o+'</th>'; });
  html += '</tr></thead><tbody>';
  MOCK_STUDENTS.forEach(s=>{
    html += '<tr><td style="font-weight:600;white-space:nowrap;font-size:.78rem">'+s.name+'</td>';
    allOutcomes.forEach(o=>{
      const cls = s.outcomes.mastered.includes(o)?'mastered':s.outcomes.developing.includes(o)?'developing':'not-started';
      html += '<td style="text-align:center"><span class="mastery-dot '+cls+'" title="'+o+': '+cls+'"></span></td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  document.getElementById('masteryContent').innerHTML = html;
}

// ===== SECTION 6: SUBMISSIONS =====
function renderSubmissions(){
  const allSubs = [];
  MOCK_STUDENTS.forEach(s=>{ s.submissions.forEach(sub=>{ allSubs.push({...sub, student:s.name, studentId:s.id}); }); });
  const statuses = ['Pending','Needs Revision','Approved'];
  let html = '<div class="submission-tabs">';
  statuses.forEach((st,i)=>{
    html += '<button class="submission-tab'+(i===0?' active':'')+'" onclick="filterSubs(this,\''+st+'\')">'+st+' ('+allSubs.filter(s=>s.status===st).length+')</button>';
  });
  html += '</div><div id="subsList">';
  const pending = allSubs.filter(s=>s.status==='Pending');
  if(!pending.length) html += '<p style="text-align:center;color:var(--text3);padding:40px">No pending submissions</p>';
  pending.forEach(sub=>{
    html += '<div class="submission-card"><span style="font-size:1.2rem">'+(sub.type==='Written'?'📝':sub.type==='Photo'?'📷':'🎨')+'</span>'+
      '<div style="flex:1"><div style="font-weight:600;font-size:.88rem;color:var(--text)">'+sub.student+'</div>'+
      '<div style="font-size:.78rem;color:var(--text3)">'+sub.title+' · '+sub.date+'</div></div>'+
      '<span class="status-chip '+(sub.status==='Pending'?'status-behind':sub.status==='Approved'?'status-on-track':'status-stuck')+'">'+sub.status+'</span>'+
      '<button class="attention-btn" onclick="openProfile('+sub.studentId+')">View</button></div>';
  });
  html += '</div>';
  document.getElementById('submissionsContent').innerHTML = html;
}

function filterSubs(btn, status){
  document.querySelectorAll('.submission-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const allSubs = [];
  MOCK_STUDENTS.forEach(s=>{ s.submissions.forEach(sub=>{ allSubs.push({...sub, student:s.name, studentId:s.id}); }); });
  const filtered = allSubs.filter(s=>s.status===status);
  const list = document.getElementById('subsList');
  if(!filtered.length){ list.innerHTML='<p style="text-align:center;color:var(--text3);padding:40px">No '+status.toLowerCase()+' submissions</p>'; return; }
  list.innerHTML = filtered.map(sub=>
    '<div class="submission-card"><span style="font-size:1.2rem">'+(sub.type==='Written'?'📝':sub.type==='Photo'?'📷':'🎨')+'</span>'+
    '<div style="flex:1"><div style="font-weight:600;font-size:.88rem;color:var(--text)">'+sub.student+'</div>'+
    '<div style="font-size:.78rem;color:var(--text3)">'+sub.title+' · '+sub.date+'</div></div>'+
    '<span class="status-chip '+(sub.status==='Pending'?'status-behind':sub.status==='Approved'?'status-on-track':'status-stuck')+'">'+sub.status+'</span>'+
    '<button class="attention-btn" onclick="openProfile('+sub.studentId+')">View</button></div>'
  ).join('');
}

// ===== SECTION 7: NOTES =====
function getNotes(){ return JSON.parse(localStorage.getItem('g7-teacher-notes')||'[]'); }
function saveNotes(notes){ localStorage.setItem('g7-teacher-notes', JSON.stringify(notes)); }

function renderNotes(){
  let notes = getNotes();
  const tagFilter = document.getElementById('noteTagFilter').value;
  if(tagFilter) notes = notes.filter(n=>n.tag===tagFilter);
  const list = document.getElementById('notesList');
  if(!notes.length){ list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:2.5rem;margin-bottom:8px">📋</div><p>No notes yet. Click "+ Add Note" to create one.</p></div>'; return; }
  list.innerHTML = notes.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((n,i)=>
    '<div class="note-card"><div class="note-body"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
    '<span style="font-weight:600;font-size:.88rem;color:var(--text)">'+n.student+'</span>'+
    '<span class="note-tag">'+n.tag+'</span></div>'+
    '<div class="note-text">'+n.text+'</div>'+
    '<div class="note-meta">'+new Date(n.date).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div></div>'+
    '<button class="note-delete" onclick="deleteNote('+i+')" title="Delete">🗑️</button></div>'
  ).join('');
}
function filterNotes(){ renderNotes(); }

function addNewNote(){
  const sel = document.getElementById('noteStudent');
  sel.innerHTML = MOCK_STUDENTS.map(s=>'<option value="'+s.name+'">'+s.name+'</option>').join('');
  document.getElementById('noteText').value='';
  document.getElementById('noteOverlay').classList.add('open');
}
function addNoteFor(id){
  const s = MOCK_STUDENTS.find(st=>st.id===id);
  addNewNote();
  if(s) document.getElementById('noteStudent').value = s.name;
}
function closeNoteModal(){ document.getElementById('noteOverlay').classList.remove('open'); }
function saveNote(){
  const notes = getNotes();
  notes.push({ student:document.getElementById('noteStudent').value, tag:document.getElementById('noteTag').value, text:document.getElementById('noteText').value, date:new Date().toISOString() });
  saveNotes(notes);
  closeNoteModal();
  renderNotes();
}
function deleteNote(idx){
  if(!confirm('Delete this note?')) return;
  const notes = getNotes(); notes.splice(idx,1); saveNotes(notes); renderNotes();
}

// ===== SECTION 8: PACING =====
function renderPacing(){
  const weeksIntoTerm = 8;
  const totalWeeks = 20;
  const expectedPct = Math.round(weeksIntoTerm/totalWeeks*100);
  let html = '<div class="dash-card"><h3 class="dash-card-title">⏱️ Student Pacing — Week '+weeksIntoTerm+' of '+totalWeeks+'</h3>'+
    '<p style="font-size:.82rem;color:var(--text3);margin-bottom:16px">Expected progress: <strong style="color:var(--accent)">'+expectedPct+'%</strong> · Dashed line = expected pace</p>';
  MOCK_STUDENTS.sort((a,b)=>b.progress-a.progress).forEach(s=>{
    const diff = s.progress - expectedPct;
    let paceClass='on-track', paceLabel='On Track';
    if(diff>=10){ paceClass='ahead'; paceLabel='Ahead'; }
    else if(diff<-15){ paceClass='far-behind'; paceLabel='Far Behind'; }
    else if(diff<0){ paceClass='behind'; paceLabel='Behind'; }
    const statusClass='status-'+paceLabel.toLowerCase().replace(/\s/g,'-');
    html += '<div class="pacing-row" onclick="openProfile('+s.id+')" style="cursor:pointer">'+
      '<div class="pacing-name">'+s.name.split(' ')[0]+' '+s.name.split(' ')[1][0]+'.</div>'+
      '<div class="pacing-bars"><div class="pacing-expected" style="width:'+expectedPct+'%"></div><div class="pacing-actual '+paceClass+'" style="width:'+s.progress+'%"></div></div>'+
      '<div class="pacing-pct">'+s.progress+'%</div>'+
      '<div class="pacing-status"><span class="status-chip '+statusClass+'">'+paceLabel+'</span></div></div>';
  });
  html += '</div>';
  document.getElementById('pacingContent').innerHTML = html;
}

// ===== STUDENT PROFILE =====
function openProfile(id){
  const s = MOCK_STUDENTS.find(st=>st.id===id);
  if(!s) return;
  const daysSince = Math.floor((Date.now()-new Date(s.lastActive).getTime())/86400000);
  const lastLabel = daysSince===0?'Today':daysSince===1?'Yesterday':daysSince+' days ago';
  const panel = document.getElementById('profilePanel');

  let html = '<div class="profile-header">'+
    '<div class="profile-avatar">'+s.name[0]+'</div>'+
    '<div><div class="profile-name">'+s.name+'</div><div class="profile-email">'+s.email+'</div></div>'+
    '<button class="profile-close" onclick="closeProfile()">✕</button></div>';

  // Quick actions
  html += '<div class="profile-quick-actions">'+
    '<button class="profile-action" onclick="addNoteFor('+s.id+');closeProfile()">📋 Add Note</button>'+
    '<button class="profile-action" onclick="alert(\'Follow-up marked for '+s.name+'\')">📌 Follow-Up</button>'+
    '<button class="profile-action" onclick="alert(\'Reminder sent to '+s.name+'\')">📧 Remind</button>'+
    '<button class="profile-action" onclick="alert(\'Override applied for '+s.name+'\')">🔓 Override</button>'+
    '<button class="profile-action" onclick="alert(\'Viewing submissions for '+s.name+'\')">📝 Submissions</button></div>';

  // Stats
  html += '<div class="profile-stats">'+
    '<div class="profile-stat"><div class="profile-stat-val">'+s.progress+'%</div><div class="profile-stat-lbl">Progress</div></div>'+
    '<div class="profile-stat"><div class="profile-stat-val">'+s.avgScore+'%</div><div class="profile-stat-lbl">Avg Score</div></div>'+
    '<div class="profile-stat"><div class="profile-stat-val">'+lastLabel+'</div><div class="profile-stat-lbl">Last Active</div></div></div>';

  // Current position
  html += '<div class="profile-section"><h4>📍 Current Position</h4>'+
    '<div style="display:flex;gap:16px;flex-wrap:wrap">'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;flex:1;min-width:120px"><div style="font-size:.72rem;color:var(--text3);text-transform:uppercase">Unit</div><div style="font-weight:700;color:var(--accent);font-size:1.1rem">'+UNITS.find(u=>u.id===s.unit).icon+' Unit '+s.unit+'</div></div>'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;flex:1;min-width:120px"><div style="font-size:.72rem;color:var(--text3);text-transform:uppercase">Lesson</div><div style="font-weight:700;color:var(--text);font-size:1.1rem">Lesson '+s.lesson+'</div></div>'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;flex:1;min-width:120px"><div style="font-size:.72rem;color:var(--text3);text-transform:uppercase">Time Spent</div><div style="font-weight:700;color:var(--text);font-size:1.1rem">'+s.timeSpent+'</div></div></div></div>';

  // Progress by unit
  html += '<div class="profile-section"><h4>📊 Progress by Unit</h4>';
  UNITS.forEach(u=>{
    html += '<div class="profile-unit-row"><div class="profile-unit-name">'+u.icon+' '+u.id+'</div>'+
      '<div class="profile-unit-bar"><div class="profile-unit-fill" style="width:'+s.unitProgress[u.id]+'%"></div></div>'+
      '<div class="profile-unit-pct">'+s.unitProgress[u.id]+'%</div></div>';
  });
  html += '</div>';

  // Quiz performance
  html += '<div class="profile-section"><h4>📝 Quiz Performance</h4>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-weight:800;font-family:Outfit;color:var(--accent);font-size:1.2rem">'+s.quizPasses+'/'+s.quizAttempts+'</div><div style="font-size:.68rem;color:var(--text3)">Passed</div></div>'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-weight:800;font-family:Outfit;color:var(--accent);font-size:1.2rem">'+s.activitiesDone+'/'+s.activitiesTotal+'</div><div style="font-size:.68rem;color:var(--text3)">Activities</div></div>'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-weight:800;font-family:Outfit;color:'+(s.avgScore>=80?'#4ade80':s.avgScore>=65?'#fbbf24':'#ef4444')+';font-size:1.2rem">'+s.avgScore+'%</div><div style="font-size:.68rem;color:var(--text3)">Average</div></div></div></div>';

  // Mastery outcomes
  html += '<div class="profile-section"><h4>🎯 Mastery Status</h4><div style="display:flex;flex-wrap:wrap;gap:6px">';
  s.outcomes.mastered.forEach(o=>{ html+='<span style="background:rgba(74,222,128,.12);color:#4ade80;padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600">✓ '+o+'</span>'; });
  s.outcomes.developing.forEach(o=>{ html+='<span style="background:rgba(251,191,36,.12);color:#fbbf24;padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600">◐ '+o+'</span>'; });
  s.outcomes.notStarted.forEach(o=>{ html+='<span style="background:var(--card2);color:var(--text3);padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600">○ '+o+'</span>'; });
  html += '</div></div>';

  // Alerts
  if(s.alerts.length){
    html += '<div class="profile-section"><h4>⚠️ Alerts</h4>';
    s.alerts.forEach(a=>{ html+='<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:.82rem;color:var(--text2)">🔴 '+a+'</div>'; });
    html += '</div>';
  }

  // Teacher notes for this student
  const notes = getNotes().filter(n=>n.student===s.name);
  if(notes.length){
    html += '<div class="profile-section"><h4>📋 Teacher Notes</h4>';
    notes.forEach(n=>{ html+='<div class="note-card" style="margin-bottom:8px"><div class="note-body"><span class="note-tag">'+n.tag+'</span><div class="note-text">'+n.text+'</div><div class="note-meta">'+new Date(n.date).toLocaleDateString('en-CA',{month:'short',day:'numeric'})+'</div></div></div>'; });
    html += '</div>';
  }

  panel.innerHTML = html;
  document.getElementById('profileOverlay').classList.add('open');
}

function closeProfile(){ document.getElementById('profileOverlay').classList.remove('open'); }

// ===== EXPORT =====
function exportAllData(){
  let csv = 'Name,Email,Unit,Lesson,Progress,Avg Score,Last Active,Status,Alerts\n';
  MOCK_STUDENTS.forEach(s=>{
    csv += '"'+s.name+'","'+s.email+'","Unit '+s.unit+'","L'+s.lesson+'",'+s.progress+'%,'+s.avgScore+'%,"'+s.lastActive+'","'+s.status+'","'+s.alerts.join('; ')+'"\n';
  });
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hpln-student-progress-'+new Date().toISOString().split('T')[0]+'.csv';
  a.click();
}

// ===== SECTION 6: SUBMISSIONS =====
function renderSubmissions(){
  const el = document.getElementById('submissionsContent');
  if(!el) return;
  // Gather submissions from mock students + localStorage
  let subs = [];
  MOCK_STUDENTS.forEach(s=>{
    if(s.submissions && s.submissions.length){
      s.submissions.forEach(sub=>{
        subs.push({...sub, studentName:s.name, studentId:s.id, email:s.email});
      });
    }
  });
  // Also merge from localStorage
  try {
    const localSubs = JSON.parse(localStorage.getItem('g7-submissions') || '[]');
    localSubs.forEach(ls=>{
      if(!subs.find(s=>s.title===ls.title && s.studentName===(ls.studentName||ls.studentEmail))){
        subs.push({type:ls.type||'Written',title:ls.title,status:ls.status||'Submitted',date:ls.submittedAt?(ls.submittedAt.split('T')[0]):'',studentName:ls.studentName||ls.studentEmail||'Unknown',studentId:0,email:ls.studentEmail||''});
      }
    });
  } catch(e){}

  const statusColors = {Pending:'rgba(251,191,36,.12)',Submitted:'rgba(251,191,36,.12)',Approved:'rgba(74,222,128,.12)','Needs Revision':'rgba(167,139,250,.12)',Returned:'rgba(56,189,248,.12)',Reviewed:'rgba(74,222,128,.12)'};
  const statusIcons = {Pending:'⏳',Submitted:'⏳',Approved:'✅','Needs Revision':'🔄',Returned:'📬',Reviewed:'✅'};

  if(!subs.length){
    el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text3)"><div style="font-size:3rem;margin-bottom:12px">📭</div><h3 style="color:var(--text)">No Submissions Yet</h3><p style="font-size:.88rem">Student submissions (drawings, photos, written responses) will appear here for review.</p></div>';
    return;
  }

  // Sort: pending first
  subs.sort((a,b)=>{
    const order = {Pending:0,Submitted:0,'Needs Revision':1,Returned:2,Reviewed:3,Approved:3};
    return (order[a.status]||0)-(order[b.status]||0);
  });

  let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">';
  const pending = subs.filter(s=>s.status==='Pending'||s.status==='Submitted').length;
  const reviewed = subs.filter(s=>s.status==='Approved'||s.status==='Reviewed').length;
  const revision = subs.filter(s=>s.status==='Needs Revision').length;
  html += '<div class="kpi-card" style="flex:1;min-width:140px"><div class="kpi-icon">⏳</div><div class="kpi-val">'+pending+'</div><div class="kpi-label">Awaiting Review</div></div>';
  html += '<div class="kpi-card" style="flex:1;min-width:140px"><div class="kpi-icon">✅</div><div class="kpi-val">'+reviewed+'</div><div class="kpi-label">Reviewed</div></div>';
  html += '<div class="kpi-card" style="flex:1;min-width:140px"><div class="kpi-icon">🔄</div><div class="kpi-val">'+revision+'</div><div class="kpi-label">Needs Revision</div></div>';
  html += '<div class="kpi-card" style="flex:1;min-width:140px"><div class="kpi-icon">📝</div><div class="kpi-val">'+subs.length+'</div><div class="kpi-label">Total</div></div>';
  html += '</div>';

  html += '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Type</th><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  subs.forEach((sub,i)=>{
    const bg = statusColors[sub.status]||'transparent';
    const icon = statusIcons[sub.status]||'📄';
    html += '<tr style="background:'+bg+'">';
    html += '<td style="font-weight:600">'+sub.studentName+'</td>';
    html += '<td><span style="font-size:.72rem;padding:2px 8px;border-radius:8px;background:var(--card2);color:var(--text2)">'+sub.type+'</span></td>';
    html += '<td>'+sub.title+'</td>';
    html += '<td style="white-space:nowrap;font-size:.82rem;color:var(--text3)">'+(sub.date||'—')+'</td>';
    html += '<td><span style="display:inline-flex;align-items:center;gap:4px;font-size:.78rem;font-weight:600">'+icon+' '+sub.status+'</span></td>';
    html += '<td style="white-space:nowrap">';
    if(sub.status==='Pending'||sub.status==='Submitted'){
      html += '<button class="activity-btn" style="font-size:.72rem;padding:4px 10px;margin-right:4px" onclick="reviewSubmission('+i+',\'Approved\')">✅ Approve</button>';
      html += '<button class="dash-back" style="font-size:.72rem;padding:4px 10px" onclick="reviewSubmission('+i+',\'Needs Revision\')">🔄 Return</button>';
    } else {
      html += '<span style="font-size:.72rem;color:var(--text3)">—</span>';
    }
    html += '</td></tr>';
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function reviewSubmission(idx, newStatus){
  // Update mock data
  let subs = [];
  MOCK_STUDENTS.forEach(s=>{
    if(s.submissions) s.submissions.forEach(sub=>subs.push(sub));
  });
  if(subs[idx]) subs[idx].status = newStatus;
  // Update localStorage submissions too
  try {
    const local = JSON.parse(localStorage.getItem('g7-submissions') || '[]');
    if(local[idx]) { local[idx].status = newStatus; localStorage.setItem('g7-submissions', JSON.stringify(local)); }
  } catch(e){}
  // Sync to Firestore
  try {
    if(typeof updateSubmissionStatus === 'function') updateSubmissionStatus(subs[idx], newStatus);
  } catch(e){}
  renderSubmissions();
}

// ===== SECTION 7: NOTES =====
function renderNotes(){
  const el = document.getElementById('notesList');
  if(!el) return;
  let notes = JSON.parse(localStorage.getItem('g7-teacher-notes') || '[]');
  const tagFilter = document.getElementById('noteTagFilter');
  const tag = tagFilter ? tagFilter.value : '';
  if(tag) notes = notes.filter(n=>n.tag===tag);
  notes.sort((a,b)=>new Date(b.date)-new Date(a.date));

  if(!notes.length){
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:2.5rem;margin-bottom:8px">📋</div><p>No notes yet. Click <strong>+ Add Note</strong> to get started.</p></div>';
    return;
  }
  el.innerHTML = notes.map((n,i)=>{
    const dateStr = new Date(n.date).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
    return '<div class="note-card" style="padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:600;font-size:.88rem;color:var(--text)">'+(n.student||'General')+'</span><span style="font-size:.72rem;color:var(--text3)">'+dateStr+'</span></div><span class="note-tag" style="display:inline-block;font-size:.68rem;padding:2px 8px;border-radius:8px;background:var(--card2);color:var(--accent);font-weight:600;margin-bottom:6px">'+n.tag+'</span><div style="font-size:.84rem;color:var(--text2);line-height:1.5">'+n.text+'</div><button onclick="deleteNote('+i+')" style="background:none;border:none;color:var(--text3);font-size:.72rem;cursor:pointer;margin-top:6px;padding:0">🗑️ Delete</button></div>';
  }).join('');
}

function addNewNote(){
  // Populate student dropdown
  const sel = document.getElementById('noteStudent');
  if(sel) {
    sel.innerHTML = '<option value="">— General —</option>' + MOCK_STUDENTS.map(s=>'<option value="'+s.name+'">'+s.name+'</option>').join('');
  }
  document.getElementById('noteText').value = '';
  document.getElementById('noteOverlay').classList.add('open');
}

function closeNoteModal(){ document.getElementById('noteOverlay').classList.remove('open'); }

function saveNote(){
  const student = document.getElementById('noteStudent').value;
  const tag = document.getElementById('noteTag').value;
  const text = document.getElementById('noteText').value.trim();
  if(!text){ alert('Please enter a note.'); return; }
  let notes = JSON.parse(localStorage.getItem('g7-teacher-notes') || '[]');
  const note = { student, tag, text, date: new Date().toISOString(), teacher: localStorage.getItem('g7-teacher-email')||'teacher' };
  notes.push(note);
  localStorage.setItem('g7-teacher-notes', JSON.stringify(notes));
  // Sync to Firestore
  try { if(typeof saveTeacherNote === 'function') saveTeacherNote(note); } catch(e){}
  closeNoteModal();
  renderNotes();
}

function deleteNote(idx){
  if(!confirm('Delete this note?')) return;
  let notes = JSON.parse(localStorage.getItem('g7-teacher-notes') || '[]');
  notes.splice(idx, 1);
  localStorage.setItem('g7-teacher-notes', JSON.stringify(notes));
  renderNotes();
}

function filterNotes(){ renderNotes(); }

// ===== SECTION 8: PACING =====
function renderPacing(){
  const el = document.getElementById('pacingContent');
  if(!el) return;
  const students = MOCK_STUDENTS;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Expected pace: ~2-3 lessons per week, so ~0.35 lessons per day across all units
  const expectedProgressPerDay = 2.5; // % per day roughly

  let html = '<div class="dash-card" style="margin-bottom:20px"><h3 class="dash-card-title">⏱️ Weekly Pacing Summary</h3><p style="font-size:.82rem;color:var(--text3);margin-bottom:16px">Shows which students are ahead of, on, or behind a comfortable weekly pace.</p>';
  html += '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Current Position</th><th>Progress</th><th>Pace</th><th>Status</th></tr></thead><tbody>';

  students.forEach(s=>{
    const daysSinceActive = Math.floor((Date.now()-new Date(s.lastActive).getTime())/86400000);
    let pace = 'On Pace', paceColor = 'var(--green)', paceIcon = '✅';
    if(daysSinceActive >= 7 || s.progress < 10){
      pace = 'Stalled'; paceColor = 'var(--red,#ef4444)'; paceIcon = '🛑';
    } else if(daysSinceActive >= 4 || s.avgScore < 65){
      pace = 'Slow'; paceColor = 'var(--yellow,#fbbf24)'; paceIcon = '⚠️';
    } else if(s.progress > 60){
      pace = 'Ahead'; paceColor = 'var(--blue,#38bdf8)'; paceIcon = '🚀';
    }

    html += '<tr><td style="font-weight:600">'+s.name+'</td>';
    html += '<td style="font-size:.82rem">Unit '+s.unit+' · Lesson '+s.lesson+'</td>';
    html += '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:80px;height:6px;background:var(--card2);border-radius:3px;overflow:hidden"><div style="width:'+s.progress+'%;height:100%;background:'+paceColor+';border-radius:3px"></div></div><span style="font-size:.78rem;font-weight:600">'+s.progress+'%</span></div></td>';
    html += '<td style="font-size:.82rem;color:var(--text3)">Active '+daysSinceActive+'d ago</td>';
    html += '<td><span style="display:inline-flex;align-items:center;gap:4px;font-size:.78rem;font-weight:600;color:'+paceColor+'">'+paceIcon+' '+pace+'</span></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div></div>';
  el.innerHTML = html;
}


// ===== FIRESTORE LIVE DATA =====
let _dashFirestoreReady = false;
let _unsubProgress = null;
let _unsubUsers = null;

function initDashboardFirebase() {
  if (typeof FIREBASE_CONFIGURED !== 'undefined' && !FIREBASE_CONFIGURED) {
    console.log('[Dashboard] Firebase config not set — using mock data');
    updateConnectionStatus(false);
    return;
  }
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.log('[Dashboard] Firebase config not set — using mock data');
    updateConnectionStatus(false);
    return;
  }
  try {
    // Use Firestore via firestore-service.js
    const db = typeof _getDb === 'function' ? _getDb() : (typeof getFirestore === 'function' ? getFirestore() : null);
    if (!db) {
      console.warn('[Dashboard] Firestore not available');
      updateConnectionStatus(false);
      return;
    }

    _dashFirestoreReady = true;
    updateConnectionStatus(true);

    // Listen for real-time student users
    _unsubUsers = db.collection('users')
      .where('role', '==', 'student')
      .onSnapshot(async function(userSnap) {
        if (userSnap.empty) {
          console.log('[Dashboard] No students in Firestore — keeping mock data');
          return;
        }

        // Build student list from users + progress + grades
        const students = [];
        let id = 1;
        const unitNames = ['A','B','C','D','E'];
        const totalLessonsPerUnit = { A:8, B:7, C:6, D:8, E:7 };

        for (const userDoc of userSnap.docs) {
          const u = userDoc.data();
          if (!u.email) continue;

          // Fetch progress for this student
          let progressData = null;
          try {
            const progDoc = await db.collection('studentProgress').doc(userDoc.id).get();
            if (progDoc.exists) progressData = progDoc.data();
          } catch(e) {}

          // Fetch grades for this student
          let gradeItems = [];
          try {
            const gradeSnap = await db.collection('grades').doc(userDoc.id)
              .collection('items').get();
            gradeItems = gradeSnap.docs.map(d => d.data());
          } catch(e) {}

          // Fetch submissions
          let submissions = [];
          try {
            const subSnap = await db.collection('submissions')
              .where('studentId', '==', userDoc.id).get();
            submissions = subSnap.docs.map(d => ({
              type: d.data().type || 'Written',
              title: d.data().title || d.data().assignmentId || 'Submission',
              status: d.data().status || 'Submitted',
              date: d.data().submittedAt ? (d.data().submittedAt.toDate ? d.data().submittedAt.toDate().toISOString().split('T')[0] : d.data().submittedAt) : ''
            }));
          } catch(e) {}

          // Calculate progress from units data
          let totalPassed = 0, totalLessons = 0, quizScores = [];
          let currentUnit = 'A', currentLesson = 1;
          let activitiesDone = 0, activitiesTotal = 0, quizPasses = 0, quizAttempts = 0;
          const unitProgress = { A:0, B:0, C:0, D:0, E:0 };

          if (progressData && progressData.units) {
            unitNames.forEach(uName => {
              const uKey = uName.toLowerCase();
              const unitData = progressData.units[uKey] || progressData.units[uName];
              const maxL = totalLessonsPerUnit[uName];
              totalLessons += maxL;

              if (unitData) {
                const passed = unitData.lessonsCompleted || (unitData.lessonsPassed ? unitData.lessonsPassed.length : 0);
                totalPassed += passed;
                unitProgress[uName] = Math.round(passed / maxL * 100);

                // Track current position — first unit/lesson not fully passed
                if (passed < maxL && uName >= currentUnit) {
                  currentUnit = uName;
                  currentLesson = passed + 1;
                }
              } else {
                totalLessons += 0; // already counted
              }
            });
          } else {
            unitNames.forEach(uName => { totalLessons += totalLessonsPerUnit[uName]; });
          }

          // Compute quiz stats from grade items
          gradeItems.forEach(g => {
            if (g.type === 'quiz' || g.quizId) {
              quizAttempts += g.attempts || 1;
              if (g.passed) quizPasses++;
              if (typeof g.percentage === 'number') quizScores.push(g.percentage);
            }
          });

          const progress = totalLessons ? Math.round(totalPassed / totalLessons * 100) : 0;
          const avgScore = quizScores.length ? Math.round(quizScores.reduce((a,b) => a+b, 0) / quizScores.length) : 0;

          // Determine last active
          let lastActive = u.lastActive;
          if (lastActive && lastActive.toDate) lastActive = lastActive.toDate().toISOString();
          else if (!lastActive) lastActive = new Date().toISOString();

          const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);

          // Determine status + alerts
          let status = 'On Track';
          const alerts = [];
          if (progress >= 90) { status = 'Complete'; }
          else if (daysSinceActive >= 7 || (avgScore > 0 && avgScore < 55)) {
            status = 'Stuck';
            if (daysSinceActive >= 7) alerts.push('Inactive ' + daysSinceActive + ' days');
            if (avgScore > 0 && avgScore < 55) alerts.push('Low quiz scores');
          }
          else if (daysSinceActive >= 4 || (avgScore > 0 && avgScore < 70) || progress < 20) {
            status = 'Behind';
            if (daysSinceActive >= 4) alerts.push('Dropping engagement');
            if (avgScore > 0 && avgScore < 70) alerts.push('Scores need support');
            if (progress < 20) alerts.push('Low progress');
          }

          // Build mastery outcomes from grade data
          const allOutcomes = UNITS.flatMap(unit => unit.outcomes);
          const mastered = [], developing = [], notStarted = [];
          allOutcomes.forEach(o => {
            const unitLetter = o.split('.')[0];
            if (unitProgress[unitLetter] >= 80) mastered.push(o);
            else if (unitProgress[unitLetter] > 0) developing.push(o);
            else notStarted.push(o);
          });

          students.push({
            id: id++,
            name: u.displayName || u.email.split('@')[0],
            email: u.email,
            avatar: u.avatar || '',
            unit: currentUnit,
            lesson: currentLesson,
            progress: progressData ? (progressData.overallCompletion || progress) : progress,
            avgScore: avgScore,
            lastActive: lastActive.split('T')[0],
            status: status,
            alerts: alerts,
            quizPasses: quizPasses,
            quizAttempts: quizAttempts,
            activitiesDone: activitiesDone,
            activitiesTotal: activitiesTotal || activitiesDone,
            timeSpent: '—',
            unitProgress: unitProgress,
            outcomes: { mastered: mastered, developing: developing, notStarted: notStarted },
            submissions: submissions
          });
        }

        if (students.length > 0) {
          // Replace MOCK_STUDENTS with live data
          window.LIVE_STUDENTS = students;
          MOCK_STUDENTS.length = 0;
          students.forEach(s => MOCK_STUDENTS.push(s));
          renderAll();
          updateLiveBadge(students.length);
          console.log('[Dashboard] Loaded ' + students.length + ' students from Firestore');
        }
      }, function(err) {
        console.warn('[Dashboard] Firestore listener error:', err.message);
        updateConnectionStatus(false);
      });

    console.log('[Dashboard] Firestore connected — listening for live data');
  } catch (e) {
    console.warn('[Dashboard] Firestore init failed:', e.message);
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(connected) {
  let indicator = document.getElementById('fbConnectionStatus');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'fbConnectionStatus';
    indicator.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9999;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:6px 14px;font-size:.75rem;display:flex;align-items:center;gap:6px;box-shadow:0 2px 12px rgba(0,0,0,.15);cursor:default;';
    document.body.appendChild(indicator);
  }
  if (connected) {
    indicator.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;animation:pulse 2s infinite"></span> <span style="color:var(--text2)">Live · Firestore</span>';
    indicator.title = 'Connected to Cloud Firestore — real-time data active';
  } else {
    indicator.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block"></span> <span style="color:var(--text3)">Mock Data</span>';
    indicator.title = 'Firebase not connected — showing demo data';
  }
}

function updateLiveBadge(count) {
  let badge = document.getElementById('liveBadge');
  if (!badge) {
    const topbar = document.querySelector('.dash-topbar');
    if (!topbar) return;
    badge = document.createElement('div');
    badge.id = 'liveBadge';
    badge.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:4px 12px;font-size:.75rem;color:#4ade80;margin-left:auto;margin-right:12px;';
    topbar.insertBefore(badge, topbar.querySelector('#dashUser'));
  }
  badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;animation:pulse 2s infinite"></span> ' + count + ' students live';
}

// Helpers — daysAgo and UNITS are defined in dashboard-data.js
// Only define if not already present (e.g. dashboard-data.js not loaded)
if (typeof daysAgo === 'undefined') {
  window.daysAgo = function(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };
}
if (typeof UNITS === 'undefined') {
  window.UNITS = [
    {id:'A',icon:'🌿',name:'Ecosystems',outcomes:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3']},
    {id:'B',icon:'🌱',name:'Plants for Food & Fibre',outcomes:['B.K.1','B.K.2','B.K.3']},
    {id:'C',icon:'🔥',name:'Heat & Temperature',outcomes:['C.K.1','C.K.2','C.K.3']},
    {id:'D',icon:'🏗️',name:'Structures & Forces',outcomes:['D.K.1','D.K.2','D.K.3']},
    {id:'E',icon:'🌍',name:'Planet Earth',outcomes:['E.K.1','E.K.2','E.K.3']}
  ];
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}';
document.head.appendChild(style);

// Init Firebase after current script and page load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initDashboardFirebase, 500);
});
