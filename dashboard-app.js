/* ============================================================
   TEACHER DASHBOARD — APPLICATION LOGIC
   ============================================================ */

const GOOGLE_CLIENT_ID = '487495658772-eck3r6d7s9in7sdc87h6knov95tr4v42.apps.googleusercontent.com';
const TEACHER_EMAILS = ['amanda.shammel@hpln.ca','admin@hpln.ca'];
let currentSort = { col:'name', asc:true };

// ===== AUTH =====
document.addEventListener('DOMContentLoaded', () => {
  // Date
  const d = new Date();
  const el = document.getElementById('dashDate');
  if(el) el.textContent = d.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  // Theme
  if(localStorage.getItem('g7-theme')==='light') document.body.classList.add('light');
  const tb = document.getElementById('dashThemeBtn');
  if(tb) tb.textContent = document.body.classList.contains('light') ? '🌙 Dark' : '☀️ Light';
  // Check auth
  const tName = localStorage.getItem('g7-teacher-name');
  const tEmail = localStorage.getItem('g7-teacher-email');
  if(tName && tEmail) { showDashboard(tName, tEmail, localStorage.getItem('g7-teacher-avatar')||''); }
  else { document.getElementById('authGate').style.display='flex'; initTeacherGSI(); }
});

function initTeacherGSI(){
  const btn = document.getElementById('teacherGoogleBtn');
  if(!btn) return;
  if(window.location.protocol==='file:') { btn.innerHTML='<p style="color:var(--text3);font-size:.8rem">Google Sign-In requires http/https</p>'; return; }
  try {
    if(typeof google==='undefined'||!google.accounts) throw new Error('GIS not loaded');
    google.accounts.id.initialize({ client_id:GOOGLE_CLIENT_ID, callback:handleTeacherCred, auto_select:false });
    google.accounts.id.renderButton(btn,{theme:'outline',size:'large',text:'signin_with',shape:'pill',width:280});
  } catch(e){ btn.innerHTML='<p style="color:var(--text3);font-size:.8rem">Google Sign-In unavailable</p>'; }
}

function handleTeacherCred(resp){
  try {
    const b = resp.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const p = JSON.parse(decodeURIComponent(atob(b).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    if(!p.email){ alert('Sign-in failed'); return; }
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
  if(code==='hpln2025'||code==='teacher'){
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
