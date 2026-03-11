/* ============================================================
   GRADE 7 SCIENCE — SHARED JAVASCRIPT MODULE
   ============================================================
   Used by landing page and all unit pages.
   Provides: theming, sign-in, quiz engine, activity helpers,
   grade recording, CSV/JSON export, navigation utilities.
   ============================================================ */

// ===== TEACHER UNLOCK =====
function isTeacherUnlocked() {
  return localStorage.getItem('g7-teacher-unlock') === 'true'
    && !!localStorage.getItem('g7-teacher-name');
}

function toggleTeacherUnlock() {
  if (isTeacherUnlocked()) {
    if (confirm('Deactivate teacher unlock mode?')) {
      localStorage.removeItem('g7-teacher-unlock');
      removeUnlockBadge();
      if (typeof updateLock === 'function') updateLock();
      // Re-lock quiz gate buttons
      document.querySelectorAll('[id$="-quiz-btn"]').forEach(btn => {
        const lessonNum = btn.id.match(/(\d+)/);
        if (lessonNum) {
          const n = parseInt(lessonNum[1]);
          const acts = actComplete['l' + n];
          const allDone = acts && Object.values(acts).every(v => v);
          if (!allDone) {
            btn.disabled = true;
            btn.style.opacity = '.5';
            btn.style.cursor = 'not-allowed';
          }
        }
      });
      alert('🔒 Teacher unlock deactivated.');
    }
    return;
  }
  const code = prompt('🔐 Enter teacher access code:');
  if (!code) return;
  if (code.trim() === 'hpln2025') {
    localStorage.setItem('g7-teacher-unlock', 'true');
    applyTeacherUnlock();
    alert('🔓 Teacher unlock activated! All lessons and quizzes are now accessible.');
  } else {
    alert('❌ Invalid code.');
  }
}

function applyTeacherUnlock() {
  showUnlockBadge();
  // Remove all nav locks
  document.querySelectorAll('.nav-item.locked').forEach(nav => nav.classList.remove('locked'));
  // Enable all quiz gate buttons
  document.querySelectorAll('[id$="-quiz-btn"]').forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  });
  // Update gate messages
  document.querySelectorAll('[id$="-gate-msg"]').forEach(msg => {
    if (!msg.textContent.includes('All activities complete')) {
      msg.innerHTML = '🔓 Teacher unlock active — quiz available.';
      msg.style.color = 'var(--accent)';
    }
  });
}

function showUnlockBadge() {
  if (document.getElementById('teacherUnlockBadge')) return;
  const badge = document.createElement('div');
  badge.id = 'teacherUnlockBadge';
  badge.title = 'Teacher Unlock Active — Click to deactivate';
  badge.textContent = '🔓';
  badge.onclick = toggleTeacherUnlock;
  Object.assign(badge.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: '99999',
    background: 'rgba(74,222,128,.15)', border: '2px solid #4ade80',
    borderRadius: '12px', padding: '6px 12px', fontSize: '1.1rem',
    cursor: 'pointer', backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 12px rgba(74,222,128,.25)',
    transition: 'transform .2s', userSelect: 'none'
  });
  badge.onmouseenter = () => badge.style.transform = 'scale(1.15)';
  badge.onmouseleave = () => badge.style.transform = 'scale(1)';
  document.body.appendChild(badge);
}

function removeUnlockBadge() {
  const badge = document.getElementById('teacherUnlockBadge');
  if (badge) badge.remove();
}

// ===== THEME =====
function toggleTheme() {
  document.body.classList.toggle('light');
  const light = document.body.classList.contains('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = light ? '🌙 Dark' : '☀️ Light';
  localStorage.setItem('g7-theme', light ? 'light' : 'dark');
}
function loadTheme() {
  if (localStorage.getItem('g7-theme') === 'light') document.body.classList.add('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = document.body.classList.contains('light') ? '🌙 Dark' : '☀️ Light';
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('show');
}

// ===== EXPANDABLE SECTIONS =====
function toggleExpand(btn) {
  btn.classList.toggle('open');
  btn.nextElementSibling.classList.toggle('open');
}

// ===== GOOGLE SIGN-IN (STUDENT) =====
// Google OAuth Client ID — same one used by the teacher dashboard
const STUDENT_GOOGLE_CLIENT_ID = localStorage.getItem('g7-google-client-id') || '487495658772-eck3r6d7s9in7sdc87h6knov95tr4v42.apps.googleusercontent.com';

/** Decode a Google JWT token to extract user info */
function parseJwtShared(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (e) { return null; }
}

/** Initialize Google Sign-In for students — renders the button inside the sign-in overlay */
function initStudentGoogleSignIn() {
  const btnContainer = document.getElementById('studentGoogleBtn');
  if (!btnContainer) return;
  // If already signed in, no need to render
  if (localStorage.getItem('g7-student-name') && localStorage.getItem('g7-student-email')) return;

  const isFileProtocol = window.location.protocol === 'file:';

  // On file://, Google Sign-In will never work — show manual button immediately
  if (isFileProtocol) {
    btnContainer.innerHTML = '<p style="color:var(--text3);font-size:.82rem;margin-bottom:10px">Google Sign-In requires http/https. Use manual sign-in for local testing.</p>' +
      '<button class="signin-btn" onclick="manualStudentSignIn()" style="font-size:.9rem">📝 Sign In Manually</button>';
    return;
  }

  // On http/https, try to render Google Sign-In button
  try {
    if (typeof google === 'undefined' || !google.accounts) throw new Error('GIS not loaded');
    google.accounts.id.initialize({
      client_id: STUDENT_GOOGLE_CLIENT_ID,
      callback: handleStudentCredential,
      auto_select: false
    });
    google.accounts.id.renderButton(btnContainer, {
      theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 280
    });
    // Also add a subtle manual fallback link below the Google button
    btnContainer.style.cssText += ';flex-direction:column;align-items:center';
    const fallback = document.createElement('div');
    fallback.style.cssText = 'margin-top:12px;font-size:.78rem;color:var(--text3);text-align:center';
    fallback.innerHTML = '<a href="#" onclick="event.preventDefault();manualStudentSignIn()" style="color:var(--text3);text-decoration:underline">Use manual sign-in instead</a>';
    btnContainer.appendChild(fallback);
  } catch (e) {
    // GIS failed to load entirely
    console.log('Google Sign-In unavailable:', e.message);
    btnContainer.innerHTML = '<p style="color:var(--text3);font-size:.82rem;margin-bottom:10px">Google Sign-In is unavailable.</p>' +
      '<button class="signin-btn" onclick="manualStudentSignIn()" style="font-size:.9rem">📝 Sign In Manually</button>';
  }
}

/** Handle Google credential response — routes to student or teacher based on flag */
function handleStudentCredential(response) {
  const payload = parseJwtShared(response.credential);
  if (!payload || !payload.email) { alert('Sign-in failed. Please try again.'); return; }

  // Check if this sign-in was from the teacher section
  const TEACHER_EMAILS = ['amanda.shammel@hpln.ca','admin@hpln.ca','amanda.yaremchuk@gmail.com','amandahammel@prrd8.ca','coreysteeves@prrd8.ca'];
  const isTeacherSignIn = sessionStorage.getItem('hpln-signin-as') === 'teacher';
  const isTeacherEmail = TEACHER_EMAILS.includes(payload.email.toLowerCase());
  sessionStorage.removeItem('hpln-signin-as'); // clear flag

  if (isTeacherSignIn && isTeacherEmail) {
    // Teacher flow: store teacher creds and redirect to dashboard
    localStorage.setItem('g7-teacher-name', payload.name || payload.email.split('@')[0]);
    localStorage.setItem('g7-teacher-email', payload.email);
    localStorage.setItem('g7-teacher-avatar', payload.picture || '');
    localStorage.setItem('g7-teacher-unlock', 'true');
    window.location.href = 'dashboard.html';
    return;
  } else if (isTeacherSignIn && !isTeacherEmail) {
    alert('⚠️ This Google account is not authorized as a teacher. Please use the access code or sign in as a student.');
    return;
  }

  // Student flow (default)
  localStorage.removeItem('g7-teacher-unlock');
  localStorage.removeItem('g7-teacher-name');
  localStorage.removeItem('g7-teacher-email');
  localStorage.removeItem('g7-teacher-avatar');
  localStorage.setItem('g7-student-name', payload.name || payload.email.split('@')[0]);
  localStorage.setItem('g7-student-email', payload.email);
  localStorage.setItem('g7-student-avatar', payload.picture || '');
  // Sync to Firebase for real-time teacher dashboard
  try { if (typeof syncStudentLogin === 'function') syncStudentLogin(payload.name, payload.email, payload.picture || ''); } catch(e) {}
  checkSignIn();
}

/** Manual fallback sign-in (for file:// or offline use) */
function manualStudentSignIn() {
  const name = prompt('Enter your full name (First Last):');
  if (!name || !name.trim()) return;
  const email = prompt('Enter your school email:');
  if (!email || !email.trim()) return;
  localStorage.removeItem('g7-teacher-unlock');
  localStorage.removeItem('g7-teacher-name');
  localStorage.removeItem('g7-teacher-email');
  localStorage.removeItem('g7-teacher-avatar');
  localStorage.setItem('g7-student-name', name.trim());
  localStorage.setItem('g7-student-email', email.trim());
  localStorage.setItem('g7-student-avatar', '');
  // Sync to Firebase for real-time teacher dashboard
  try { if (typeof syncStudentLogin === 'function') syncStudentLogin(name.trim(), email.trim(), ''); } catch(e) {}
  checkSignIn();
}

/** Legacy wrapper — some HTML files still call googleSignIn() */
function googleSignIn() { manualStudentSignIn(); }

/** Check sign-in status — hide overlay if signed in, show student info in top bar */
function checkSignIn() {
  const name = localStorage.getItem('g7-student-name');
  const email = localStorage.getItem('g7-student-email');
  const avatar = localStorage.getItem('g7-student-avatar');
  const overlay = document.getElementById('signinOverlay');
  const display = document.getElementById('studentDisplay');
  if (name && email) {
    if (overlay) overlay.classList.add('hidden');
    if (display) {
      const firstName = name.split(' ')[0];
      const avatarHtml = avatar ? '<img src="' + avatar + '" alt="" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px;border:1.5px solid var(--accent)">' : '👤 ';
      display.innerHTML = avatarHtml + firstName +
        ' <a href="#" onclick="event.preventDefault();studentSignOut()" title="Sign out" style="color:var(--text3);text-decoration:none;margin-left:6px;font-size:.75rem;opacity:.7">✕</a>';
    }
  } else {
    if (overlay) overlay.classList.remove('hidden');
    if (display) display.textContent = '';
  }
}

/** Student sign out — clear credentials and reload */
function studentSignOut() {
  if (!confirm('Sign out? Your progress on this device will be cleared.')) return;
  localStorage.removeItem('g7-student-name');
  localStorage.removeItem('g7-student-email');
  localStorage.removeItem('g7-student-avatar');
  localStorage.removeItem('g7-teacher-unlock');
  localStorage.removeItem('g7-teacher-name');
  localStorage.removeItem('g7-teacher-email');
  localStorage.removeItem('g7-teacher-avatar');
  // Sync sign-out to Firebase
  try { if (typeof syncStudentSignOut === 'function') syncStudentSignOut(localStorage.getItem('g7-student-email')); } catch(e) {}
  // Revoke Google session if available
  try { if (typeof google !== 'undefined' && google.accounts) google.accounts.id.disableAutoSelect(); } catch(e) {}
  location.reload();
}

// ===== GRADE RECORDING =====
function recordGrade(quizId, lessonTitle, score, total, passed) {
  const name = localStorage.getItem('g7-student-name') || 'Unknown';
  const email = localStorage.getItem('g7-student-email') || 'unknown';
  const pct = Math.round(score / total * 100);
  const record = { email, name, quizId, lessonTitle, score, total, percentage: pct, passed, attempts: 1, remediationUsed: false, timestamp: new Date().toISOString() };
  let grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  const existing = grades.findIndex(g => g.email === email && g.quizId === quizId);
  if (existing >= 0) {
    record.attempts = (grades[existing].attempts || 1) + 1;
    if (pct > grades[existing].percentage) grades[existing] = record;
    else grades[existing].attempts = record.attempts;
  } else { grades.push(record); }
  localStorage.setItem('g7-grades', JSON.stringify(grades));
  const url = localStorage.getItem('g7-apps-script-url') || APPS_SCRIPT_URL;
  if (url) {
    fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(e => console.log('Apps Script sync:', e));
  }
  // Sync quiz result to Firebase Realtime DB (legacy)
  try { if (typeof syncQuizResult === 'function') { var unitId = typeof getUnitId === 'function' ? getUnitId() : null; if (unitId) syncQuizResult(unitId, quizId, score, total, passed); } } catch(e) {}
  // Sync to Firestore (Phase 3)
  try { if (typeof saveGrade === 'function') saveGrade(record); } catch(e) { console.warn('Firestore grade sync:', e); }
}

// ===== CSV EXPORT =====
function exportCSV() {
  const grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  if (!grades.length) { alert('No grade data to export.'); return; }
  let csv = 'Name,Email,Quiz,Lesson,Score,Total,Percentage,Passed,Attempts,Timestamp\n';
  grades.forEach(g => { csv += `"${g.name}","${g.email}","${g.quizId}","${g.lessonTitle || ''}",${g.score},${g.total},${g.percentage}%,${g.passed ? 'Yes' : 'No'},${g.attempts},"${g.timestamp}"\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'G7Science_Grades_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

// ===== JSON EXPORT =====
function exportJSON() {
  const grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  if (!grades.length) { alert('No grade data to export.'); return; }
  const blob = new Blob([JSON.stringify(grades, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'G7Science_Grades_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
}

// ===== CLEAR GRADES =====
function clearGrades() {
  if (!confirm('Delete ALL stored grade data? This cannot be undone.')) return;
  localStorage.removeItem('g7-grades');
  if (typeof renderTeacherDashboard === 'function') renderTeacherDashboard();
}

// ===== TEACHER DASHBOARD =====
function renderTeacherDashboard() {
  const grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  const el = document.getElementById('teacherGrades');
  if (!el) return;
  if (!grades.length) { el.innerHTML = '<p style="color:var(--text3)">No grade data recorded yet.</p>'; return; }
  let html = '<table class="grade-table"><thead><tr><th>Student</th><th>Email</th><th>Quiz</th><th>Score</th><th>%</th><th>Passed</th><th>Attempts</th><th>Date</th></tr></thead><tbody>';
  grades.forEach(g => { html += `<tr><td>${g.name}</td><td>${g.email}</td><td>${g.quizId}</td><td>${g.score}/${g.total}</td><td>${g.percentage}%</td><td>${g.passed ? '✅' : '❌'}</td><td>${g.attempts}</td><td>${g.timestamp ? g.timestamp.slice(0, 10) : ''}</td></tr>`; });
  html += '</tbody></table>';
  el.innerHTML = html;
  const urlInput = document.getElementById('appsScriptUrl');
  if (urlInput) urlInput.value = localStorage.getItem('g7-apps-script-url') || '';
}

// ===== ADAPTIVE QUIZ ENGINE =====
// Each unit page creates its own quizBanks object and calls initQuiz().
// quizState is kept global so the engine works across pages.
const quizState = {};

/** Initialize a quiz with given bank ID and quiz banks object */
function initQuiz(qid, quizBanks) {
  const bank = quizBanks[qid];
  if (!bank) { console.error('Quiz bank not found:', qid); return; }
  quizState[qid] = {
    currentQ: 0,
    questions: bank.primary.map((q, i) => ({ ...q, idx: i, isReplacement: false, strikes: 0 })),
    score: 0, answered: 0, total: bank.primary.length,
    inRemediation: false, remOutcome: null, remQuestions: [], remIdx: 0, remCorrect: 0,
    banks: quizBanks
  };
  renderAQ(qid);
}

/** Render adaptive quiz question */
function renderAQ(qid) {
  const s = quizState[qid];
  const area = document.getElementById(qid.replace('quiz', 'quiz') + '-area');
  if (!area) return;
  if (s.inRemediation) { renderRem(qid); return; }
  if (s.currentQ >= s.total) { showResults(qid); return; }
  const q = s.questions[s.currentQ];
  const letters = ['A', 'B', 'C', 'D'];
  const pct = Math.round(s.currentQ / s.total * 100);
  area.innerHTML = `<div class="quiz-view active"><div class="quiz-progress"><div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div><div class="quiz-progress-text">Question ${s.currentQ + 1} of ${s.total}</div></div><div class="quiz-question-wrap"><div class="question-card"><div class="q-outcome">${q.outcome}</div><div class="q-text">${q.q}</div><div class="options">${q.opts.map((o, j) => `<button class="option-btn" onclick="pickAns('${qid}',${j})"><span class="option-letter">${letters[j]}</span>${o}</button>`).join('')}</div><div class="feedback-box" id="${qid}-fb"></div><div class="quiz-nav"><button class="quiz-next-btn" id="${qid}-next" onclick="nextQ('${qid}')">Next →</button></div></div></div></div>`;
}

/** Handle answer selection */
function pickAns(qid, oi) {
  const s = quizState[qid], q = s.questions[s.currentQ];
  const area = document.getElementById(qid + '-area');
  const btns = area.querySelectorAll('.option-btn');
  if (btns[0].classList.contains('disabled')) return;
  btns.forEach(b => b.classList.add('disabled'));
  const fb = document.getElementById(qid + '-fb'), nb = document.getElementById(qid + '-next');
  if (oi === q.ans) {
    btns[oi].classList.add('correct-answer');
    fb.className = 'feedback-box show correct';
    fb.textContent = '✅ Correct! ' + q.explain;
    s.score++; s.answered++;
    nb.classList.add('show');
  } else {
    btns[oi].classList.add('wrong-answer');
    btns[q.ans].classList.add('correct-answer');
    q.strikes++; s.answered++;
    if (q.strikes === 1 && !q.isReplacement) {
      const rep = s.banks[qid].replacement[q.idx];
      if (rep) {
        fb.className = 'feedback-box show wrong';
        fb.innerHTML = '❌ ' + q.explain + '<br><br>⚡ <strong>Let\'s try a similar question…</strong>';
        s.questions[s.currentQ] = { ...rep, idx: q.idx, isReplacement: true, strikes: 0 };
        s.answered--;
        setTimeout(() => renderAQ(qid), 2200);
        return;
      }
    } else if ((q.strikes >= 1 && q.isReplacement) || q.strikes >= 2) {
      const oc = q.outcome, bk = s.banks[qid].remediation[oc];
      if (bk) {
        fb.className = 'feedback-box show wrong';
        fb.innerHTML = '❌ ' + q.explain + '<br><br>📖 <strong>Time for a mini-lesson! Watch a video and answer 3 questions.</strong>';
        setTimeout(() => { s.inRemediation = true; s.remOutcome = oc; s.remCorrect = 0; pickRemQ(qid); renderAQ(qid); }, 2800);
        return;
      }
    }
    fb.className = 'feedback-box show wrong';
    fb.textContent = '❌ ' + q.explain;
    nb.classList.add('show');
  }
}

/** Pick remediation questions */
function pickRemQ(qid) {
  const s = quizState[qid], pool = s.banks[qid].remediation[s.remOutcome].questions;
  s.remQuestions = [...pool].sort(() => Math.random() - .5).slice(0, 3);
  s.remIdx = 0; s.remCorrect = 0;
}

/** Render remediation view */
function renderRem(qid) {
  const s = quizState[qid], area = document.getElementById(qid + '-area');
  const bk = s.banks[qid].remediation[s.remOutcome];
  const videoSrc = bk.video || bk.videoUrl || '';
  if (s.remIdx === 0) {
    area.innerHTML = `<div class="remediation-view active"><div class="remediation-header"><h2>📖 Mini-Lesson: ${s.remOutcome}</h2><p>Watch this video, then answer 3 questions correctly to continue.</p></div><div class="glass-card"><div class="video-wrap"><iframe src="${videoSrc}" title="Remediation" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div><div style="text-align:center;margin-top:20px"><button class="nav-btn primary" onclick="startRemQ('${qid}')">I've Watched — Start Questions →</button></div></div>`;
    return;
  }
  renderRemQ(qid);
}

function startRemQ(qid) { quizState[qid].remIdx = 1; renderRemQ(qid); }

/** Render a remediation question */
function renderRemQ(qid) {
  const s = quizState[qid], q = s.remQuestions[s.remCorrect];
  if (!q) { pickRemQ(qid); renderRemQ(qid); return; }
  const area = document.getElementById(qid + '-area'), letters = ['A', 'B', 'C', 'D'];
  area.innerHTML = `<div class="remediation-view active"><div class="remediation-header"><h2>📖 Mini-Lesson: ${s.remOutcome}</h2><p>Get all 3 correct to return! (${s.remCorrect}/3)</p></div><div class="question-card"><div class="q-outcome">${s.remOutcome} — Remediation</div><div class="q-text">${q.q}</div><div class="options">${q.opts.map((o, j) => `<button class="option-btn" onclick="pickRemAns('${qid}',${j})"><span class="option-letter">${letters[j]}</span>${o}</button>`).join('')}</div><div class="feedback-box" id="${qid}-rfb"></div><div class="quiz-nav"><button class="quiz-next-btn" id="${qid}-rnxt" onclick="nextRemQ('${qid}')">Next →</button></div></div></div>`;
}

/** Handle remediation answer */
function pickRemAns(qid, oi) {
  const s = quizState[qid], q = s.remQuestions[s.remCorrect];
  const area = document.getElementById(qid + '-area');
  const btns = area.querySelectorAll('.option-btn');
  if (btns[0].classList.contains('disabled')) return;
  btns.forEach(b => b.classList.add('disabled'));
  const fb = document.getElementById(qid + '-rfb'), nb = document.getElementById(qid + '-rnxt');
  if (oi === q.ans) {
    btns[oi].classList.add('correct-answer');
    fb.className = 'feedback-box show correct';
    fb.textContent = '✅ ' + q.explain;
    s.remCorrect++;
    nb.classList.add('show');
    if (s.remCorrect >= 3) nb.textContent = 'Return to Quiz ✓';
  } else {
    btns[oi].classList.add('wrong-answer');
    btns[q.ans].classList.add('correct-answer');
    fb.className = 'feedback-box show wrong';
    fb.innerHTML = '❌ ' + q.explain + '<br><br>🔄 <strong>Let\'s try again from the start…</strong>';
    setTimeout(() => { s.remCorrect = 0; pickRemQ(qid); s.remIdx = 1; renderRemQ(qid); }, 2200);
  }
}

/** Advance remediation or return to quiz */
function nextRemQ(qid) {
  const s = quizState[qid];
  if (s.remCorrect >= 3) {
    s.inRemediation = false; s.remOutcome = null;
    s.currentQ = 0; s.score = 0; s.answered = 0;
    s.questions = s.banks[qid].primary.map((q, i) => ({ ...q, idx: i, isReplacement: false, strikes: 0 }));
    renderAQ(qid);
    return;
  }
  renderRemQ(qid);
}

/** Advance to next question */
function nextQ(qid) { quizState[qid].currentQ++; renderAQ(qid); }

/** Show quiz results */
function showResults(qid) {
  const s = quizState[qid];
  const pct = Math.round(s.score / s.total * 100);
  const pass = pct >= 80;
  const area = document.getElementById(qid + '-area');
  // Extract lesson number from qid (e.g. "quiz1" → 1)
  const ln = parseInt(qid.replace(/\D/g, ''), 10) || 1;
  const unitKey = document.body.dataset.unitKey || 'a';
  if (pass) {
    localStorage.setItem(`g7-unit${unitKey}-lesson${ln}-passed`, 'true');
    localStorage.setItem(`g7-unit${unitKey}-lesson${ln}-pct`, pct);
    if (typeof updateLock === 'function') updateLock();
    if (typeof updateProgress === 'function') updateProgress();
    // Sync to Firestore (Phase 3)
    try { if (typeof saveProgress === 'function') saveProgress(unitKey, ln, true); } catch(e) {}
  }
  recordGrade(qid, `Unit ${unitKey.toUpperCase()} Lesson ${ln}`, s.score, s.total, pass);
  let bh = '';
  if (pass) {
    bh = `<button class="results-btn primary" onclick="goTo('home')">Continue →</button><button class="results-btn" onclick="initQuiz('${qid}', quizState['${qid}'].banks)">🔄 Retake</button>`;
  } else {
    bh = `<button class="results-btn primary" onclick="goTo('lesson${ln}')">📖 Review Lesson</button><button class="results-btn" onclick="initQuiz('${qid}', quizState['${qid}'].banks)">🔄 Retry</button>`;
  }
  area.innerHTML = `<div class="quiz-results-view active"><div class="score-circle ${pass ? 'pass' : 'fail'}">${pct}%</div><p class="quiz-msg">${pass ? '🎉 Excellent! You\'ve mastered this lesson!' : '📖 You need 80% to unlock the next lesson.'}</p><p class="quiz-msg-sub">${s.score}/${s.total} (${pct}%)${pass ? '' : ' — Need ' + Math.ceil(s.total * .8)}</p><div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">${bh}</div></div>`;
}

// ===== ACTIVITY GATE SYSTEM =====
// Each unit page defines its own actComplete map and calls these helpers.
let actComplete = {};

/** Save actComplete state to localStorage */
function saveActState() {
  const unitKey = document.body.dataset.unitKey || document.body.dataset.unit || 'a';
  localStorage.setItem(`g7-unit${unitKey}-actComplete`, JSON.stringify(actComplete));
}

/** Restore actComplete state from localStorage */
function restoreActState() {
  const unitKey = document.body.dataset.unitKey || document.body.dataset.unit || 'a';
  const saved = localStorage.getItem(`g7-unit${unitKey}-actComplete`);
  if (saved) {
    try {
      const restored = JSON.parse(saved);
      // Merge restored state into actComplete (preserving structure)
      for (const lesson in restored) {
        if (!actComplete[lesson]) actComplete[lesson] = {};
        for (const act in restored[lesson]) {
          if (restored[lesson][act]) actComplete[lesson][act] = true;
        }
      }
    } catch(e) { /* ignore corrupt data */ }
  }
  // Check all gates after restoring
  for (const key in actComplete) {
    const lessonNum = key.replace('l', '');
    checkGate(parseInt(lessonNum));
  }
}

/** Mark an activity as complete and check the gate */
function markActivityDone(lesson, actName, score, total) {
  const key = 'l' + lesson;
  if (!actComplete[key]) actComplete[key] = {};
  actComplete[key][actName] = true;
  // Persist to localStorage
  saveActState();
  const unitKey = document.body.dataset.unitKey || 'a';
  // Also save the individual score for potential restoration
  localStorage.setItem(`g7-unit${unitKey}-l${lesson}-${actName}-score`, `${score}/${total}`);
  recordGrade(`${unitKey}-l${lesson}-${actName}`, `Unit ${unitKey.toUpperCase()} Lesson ${lesson} Activity: ${actName}`, score, total, true);
  checkGate(lesson);
}

/** Check if an activity was already completed (for skipping re-render) */
function isActivityDone(lesson, actName) {
  const key = 'l' + lesson;
  return actComplete[key] && actComplete[key][actName];
}

/** Check if all activities for a lesson are complete; unlock quiz button */
function checkGate(lesson) {
  const acts = actComplete['l' + lesson];
  if (!acts) return;
  const allDone = Object.values(acts).every(v => v);
  const btn = document.getElementById('l' + lesson + '-quiz-btn');
  const msg = document.getElementById('l' + lesson + '-gate-msg');
  // Teacher unlock bypasses activity gate
  if (btn && (allDone || isTeacherUnlocked())) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    if (msg && allDone) { msg.innerHTML = '✅ All activities complete! You may now take the quiz.'; msg.style.color = 'var(--accent)'; }
    else if (msg && isTeacherUnlocked()) { msg.innerHTML = '🔓 Teacher unlock active — quiz available.'; msg.style.color = 'var(--accent)'; }
    // Set localStorage flag so lockMap can unlock the quiz page
    const unitKey = document.body.dataset.unitKey || document.body.dataset.unit || 'a';
    if (allDone) localStorage.setItem(`g7-unit${unitKey}-l${lesson}-gate`, 'true');
    updateLock();
  }
}

/** Update sidebar nav items locked/unlocked state based on lockMap + localStorage */
function updateLock() {
  if (typeof lockMap === 'undefined') return;
  document.querySelectorAll('.nav-item[data-page]').forEach(nav => {
    const page = nav.dataset.page;
    if (lockMap[page]) {
      if (isTeacherUnlocked() || localStorage.getItem(lockMap[page])) {
        nav.classList.remove('locked');
      } else {
        nav.classList.add('locked');
      }
    }
  });
}

// ===== PAGE NAVIGATION (within a unit) =====
function goTo(page) {
  // Check locks (skip if teacher unlock is active)
  const unitKey = document.body.dataset.unitKey || 'a';
  if (!isTeacherUnlocked() && typeof lockMap !== 'undefined' && lockMap[page]) {
    if (!localStorage.getItem(lockMap[page])) return;
  }
  document.querySelectorAll('.lesson-page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    if (n.dataset.page === page) n.classList.add('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.innerWidth <= 900) { const sb = document.getElementById('sidebar'); const ov = document.getElementById('overlay'); if (sb) sb.classList.remove('open'); if (ov) ov.classList.remove('show'); }
  // Fire page-specific init via custom callback

  if (typeof onPageLoad === 'function') onPageLoad(page);
}

// ===== PAUSE-AND-CHECK REVEAL =====
function revealAnswer(btn) {
  const panel = btn.nextElementSibling;
  const isOpen = panel.classList.toggle('open');
  btn.textContent = isOpen ? '🙈 Hide Answers' : '👀 Reveal Answers';
}

// ===== CONSTRUCTED RESPONSE & REFLECTION =====
function saveCR() {
  const unitKey = document.body.dataset.unitKey || 'a';
  const el = document.getElementById('crResponse');
  if (el) localStorage.setItem(`g7-unit${unitKey}-l1-cr`, el.value);
}
function saveReflection() {
  const unitKey = document.body.dataset.unitKey || 'a';
  const el = document.getElementById('reflectionText');
  if (el) localStorage.setItem(`g7-unit${unitKey}-l1-reflect`, el.value);
}
function loadSavedText() {
  const unitKey = document.body.dataset.unitKey || 'a';
  const cr = document.getElementById('crResponse');
  const rf = document.getElementById('reflectionText');
  if (cr) cr.value = localStorage.getItem(`g7-unit${unitKey}-l1-cr`) || '';
  if (rf) rf.value = localStorage.getItem(`g7-unit${unitKey}-l1-reflect`) || '';
}

// ===== READ TO ME — TEXT-TO-SPEECH =====
const ttsState = { speaking: false, paused: false, sections: [], currentIdx: 0, rate: 1.0 };

function initReadToMe() {
  if (!('speechSynthesis' in window)) return; // Browser doesn't support TTS
  const toolbar = document.createElement('div');
  toolbar.className = 'tts-toolbar';
  toolbar.id = 'ttsToolbar';
  toolbar.innerHTML = `
    <button class="tts-toggle" id="ttsMainBtn" onclick="toggleTTS()" title="Read to Me">🔊</button>
    <span class="tts-toggle-label">Read to Me</span>
    <div class="tts-controls" id="ttsControls" style="display:none">
      <button class="tts-btn" onclick="ttsBack()" title="Previous section">⏮</button>
      <button class="tts-btn" id="ttsPauseBtn" onclick="ttsPause()" title="Pause">⏸</button>
      <button class="tts-btn" onclick="ttsForward()" title="Next section">⏭</button>
      <button class="tts-btn" onclick="ttsStop()" title="Stop" style="color:var(--danger)">⏹</button>
      <select class="tts-rate" id="ttsRate" onchange="ttsChangeRate(this.value)" title="Reading speed">
        <option value="0.8">0.8×</option>
        <option value="0.9">0.9×</option>
        <option value="1" selected>1.0×</option>
        <option value="1.1">1.1×</option>
        <option value="1.2">1.2×</option>
        <option value="1.5">1.5×</option>
      </select>
    </div>`;
  document.body.appendChild(toolbar);
}

function toggleTTS() {
  if (ttsState.speaking) { ttsStop(); return; }
  // Gather all visible content sections on the active page
  const activePage = document.querySelector('.lesson-page.active');
  if (!activePage) return;
  const sections = activePage.querySelectorAll('.glass-card.content, .key-point, .pause-check, .constructed-response, .reflection-box');
  if (!sections.length) return;
  ttsState.sections = Array.from(sections);
  ttsState.currentIdx = 0;
  ttsState.speaking = true;
  ttsState.paused = false;
  document.getElementById('ttsControls').style.display = 'flex';
  document.getElementById('ttsMainBtn').classList.add('playing');
  document.getElementById('ttsMainBtn').innerHTML = '🔇';
  document.querySelector('.tts-toggle-label').textContent = 'Reading…';
  readCurrentSection();
}

function readCurrentSection() {
  if (!ttsState.speaking || ttsState.currentIdx >= ttsState.sections.length) { ttsStop(); return; }
  // Remove previous highlight
  document.querySelectorAll('.tts-reading').forEach(el => el.classList.remove('tts-reading'));
  const section = ttsState.sections[ttsState.currentIdx];
  section.classList.add('tts-reading');
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Get clean text content (skip buttons, inputs, iframes)
  const text = getReadableText(section);
  if (!text.trim()) { ttsState.currentIdx++; readCurrentSection(); return; }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = ttsState.rate;
  utterance.pitch = 1.0;
  utterance.lang = 'en-CA';

  utterance.onend = () => {
    section.classList.remove('tts-reading');
    ttsState.currentIdx++;
    if (ttsState.speaking && ttsState.currentIdx < ttsState.sections.length) {
      readCurrentSection();
    } else {
      ttsStop();
    }
  };
  utterance.onerror = () => { ttsStop(); };

  speechSynthesis.cancel(); // Clear any queued speech
  speechSynthesis.speak(utterance);
}

function getReadableText(el) {
  const clone = el.cloneNode(true);
  // Remove elements that shouldn't be read
  clone.querySelectorAll('button, input, textarea, select, iframe, .vocab-def, .reveal-answer, script, style').forEach(e => e.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function ttsPause() {
  if (!ttsState.speaking) return;
  if (ttsState.paused) {
    speechSynthesis.resume();
    ttsState.paused = false;
    document.getElementById('ttsPauseBtn').innerHTML = '⏸';
    document.getElementById('ttsPauseBtn').title = 'Pause';
  } else {
    speechSynthesis.pause();
    ttsState.paused = true;
    document.getElementById('ttsPauseBtn').innerHTML = '▶';
    document.getElementById('ttsPauseBtn').title = 'Resume';
  }
}

function ttsStop() {
  speechSynthesis.cancel();
  ttsState.speaking = false;
  ttsState.paused = false;
  ttsState.currentIdx = 0;
  document.querySelectorAll('.tts-reading').forEach(el => el.classList.remove('tts-reading'));
  document.getElementById('ttsControls').style.display = 'none';
  document.getElementById('ttsMainBtn').classList.remove('playing');
  document.getElementById('ttsMainBtn').innerHTML = '🔊';
  document.querySelector('.tts-toggle-label').textContent = 'Read to Me';
}

function ttsBack() {
  if (!ttsState.speaking) return;
  speechSynthesis.cancel();
  ttsState.currentIdx = Math.max(0, ttsState.currentIdx - 1);
  readCurrentSection();
}

function ttsForward() {
  if (!ttsState.speaking) return;
  speechSynthesis.cancel();
  ttsState.currentIdx = Math.min(ttsState.sections.length - 1, ttsState.currentIdx + 1);
  readCurrentSection();
}

function ttsChangeRate(val) {
  ttsState.rate = parseFloat(val);
  if (ttsState.speaking && !ttsState.paused) {
    speechSynthesis.cancel();
    readCurrentSection();
  }
}

// ===== DRAWING CANVAS TOOL =====
function initDrawingCanvas(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const storageKey = opts.storageKey || containerId + '-drawing';
  const bgImage = opts.backgroundImage || null;
  const width = opts.width || 800;
  const height = opts.height || 500;
  const title = opts.title || 'Drawing Canvas';

  container.innerHTML = `
    <div class="tool-card drawing-canvas-wrap">
      <div class="tool-header"><span class="tool-icon">🎨</span> ${title}</div>
      ${opts.instructions ? `<p class="tool-instructions">${opts.instructions}</p>` : ''}
      <div class="drawing-toolbar">
        <div class="drawing-colors">
          ${['#1a1a1a','#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff'].map(c =>
            `<button class="color-btn${c==='#1a1a1a'?' active':''}" data-color="${c}" style="background:${c};${c==='#ffffff'?'border:2px solid #ccc;':''}"></button>`
          ).join('')}
        </div>
        <div class="drawing-tools">
          <select class="drawing-thickness" title="Brush size">
            <option value="2">Thin</option>
            <option value="4" selected>Medium</option>
            <option value="8">Thick</option>
            <option value="14">Bold</option>
          </select>
          <button class="tool-btn active" data-tool="pen" title="Pen">✏️ Pen</button>
          <button class="tool-btn" data-tool="eraser" title="Eraser">🧹 Eraser</button>
          <button class="tool-btn" data-tool="undo" title="Undo">↩️</button>
          <button class="tool-btn" data-tool="redo" title="Redo">↪️</button>
          <button class="tool-btn" data-tool="clear" title="Clear">🗑️ Clear</button>
        </div>
      </div>
      <canvas id="${containerId}-canvas" width="${width}" height="${height}" class="drawing-canvas"></canvas>
      <div class="tool-actions">
        <button class="tool-action-btn secondary" onclick="downloadDrawing('${containerId}')">💾 Save as Image</button>
        <button class="tool-action-btn primary" onclick="submitDrawing('${containerId}')">📤 Submit Drawing</button>
        <span class="tool-status" id="${containerId}-status"></span>
      </div>
    </div>`;

  const canvas = document.getElementById(containerId + '-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let currentColor = '#1a1a1a';
  let currentTool = 'pen';
  let lineWidth = 4;
  let history = [];
  let historyIndex = -1;

  // Load background image
  function initCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    if (bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { ctx.drawImage(img, 0, 0, width, height); saveState(); };
      img.src = bgImage;
    } else {
      saveState();
    }
  }

  function saveState() {
    historyIndex++;
    history = history.slice(0, historyIndex);
    history.push(canvas.toDataURL());
    if (history.length > 25) { history.shift(); historyIndex--; }
  }

  function undo() { if (historyIndex > 0) { historyIndex--; restoreState(); } }
  function redo() { if (historyIndex < history.length - 1) { historyIndex++; restoreState(); } }

  function restoreState() {
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, width, height); ctx.drawImage(img, 0, 0); };
    img.src = history[historyIndex];
  }

  // Events
  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    ctx.beginPath();
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (width / r.width);
    const y = (e.clientY - r.top) * (height / r.height);
    ctx.moveTo(x, y);
  });

  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (width / r.width);
    const y = (e.clientY - r.top) * (height / r.height);
    ctx.lineWidth = currentTool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  canvas.addEventListener('pointerup', () => { if (drawing) { drawing = false; saveState(); } });
  canvas.addEventListener('pointerleave', () => { if (drawing) { drawing = false; saveState(); } });
  canvas.style.touchAction = 'none'; // Prevent scroll while drawing

  // Toolbar
  container.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
      currentTool = 'pen';
      container.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      container.querySelector('[data-tool="pen"]').classList.add('active');
    });
  });

  container.querySelector('.drawing-thickness').addEventListener('change', e => {
    lineWidth = parseInt(e.target.value);
  });

  container.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool === 'undo') return undo();
      if (tool === 'redo') return redo();
      if (tool === 'clear') {
        if (confirm('Clear the entire canvas?')) { initCanvas(); }
        return;
      }
      container.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = tool;
    });
  });

  // Auto-save every 30s
  setInterval(() => {
    if (history.length > 1) {
      localStorage.setItem(storageKey, canvas.toDataURL());
    }
  }, 30000);

  // Restore from localStorage
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0); saveState(); };
    img.src = saved;
  } else {
    initCanvas();
  }

  // Store reference for download/submit
  window['_canvas_' + containerId] = { canvas, storageKey };
}

function downloadDrawing(containerId) {
  const ref = window['_canvas_' + containerId];
  if (!ref) return;
  const link = document.createElement('a');
  link.download = containerId + '.png';
  link.href = ref.canvas.toDataURL();
  link.click();
  const status = document.getElementById(containerId + '-status');
  if (status) { status.textContent = '✅ Image saved!'; setTimeout(() => status.textContent = '', 3000); }
}

function submitDrawing(containerId) {
  const ref = window['_canvas_' + containerId];
  if (!ref) return;
  const data = ref.canvas.toDataURL();
  localStorage.setItem(ref.storageKey, data);
  const status = document.getElementById(containerId + '-status');
  const unitKey = document.body.dataset.unitKey || 'a';
  // Submit to Firestore
  submitStudentWork({
    type: 'drawing',
    title: 'Drawing: ' + containerId,
    assignmentId: unitKey + '-' + containerId,
    content: '(canvas drawing saved)',
    attachmentType: 'image/png'
  }).then(result => {
    if (status) {
      status.textContent = result.cloud ? '✅ Drawing submitted to teacher!' : '✅ Drawing saved locally';
      setTimeout(() => status.textContent = '', 4000);
    }
  });
}

// ===== PHOTO CAPTURE TOOL =====
function initPhotoCapture(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const storageKey = opts.storageKey || containerId + '-photo';
  const title = opts.title || 'Photo Capture';
  const maxPhotos = opts.maxPhotos || 3;

  container.innerHTML = `
    <div class="tool-card photo-capture-wrap">
      <div class="tool-header"><span class="tool-icon">📸</span> ${title}</div>
      ${opts.instructions ? `<p class="tool-instructions">${opts.instructions}</p>` : ''}
      <div class="photo-options">
        <button class="tool-action-btn primary" id="${containerId}-cameraBtn">📷 Take Photo</button>
        <span class="tool-or">or</span>
        <label class="tool-action-btn secondary" for="${containerId}-fileInput">📁 Upload Photo</label>
        <input type="file" id="${containerId}-fileInput" accept="image/*" multiple style="display:none">
      </div>
      <div class="photo-camera-area" id="${containerId}-cameraArea" style="display:none">
        <video id="${containerId}-video" autoplay playsinline class="photo-preview"></video>
        <div class="photo-camera-controls">
          <button class="tool-action-btn primary" id="${containerId}-captureBtn">📸 Capture</button>
          <button class="tool-action-btn secondary" id="${containerId}-switchBtn">🔄 Switch Camera</button>
          <button class="tool-action-btn secondary" id="${containerId}-closeCam">✕ Close</button>
        </div>
      </div>
      <div class="photo-gallery" id="${containerId}-gallery"></div>
      <textarea class="tool-caption" id="${containerId}-caption" placeholder="Add a description of your photo(s)..." rows="2"></textarea>
      <div class="tool-actions">
        <button class="tool-action-btn primary" onclick="submitPhotos('${containerId}')">📤 Submit Photo(s)</button>
        <span class="tool-status" id="${containerId}-status"></span>
      </div>
    </div>`;

  let photos = JSON.parse(localStorage.getItem(storageKey) || '[]');
  let stream = null;
  let facingMode = 'environment';

  function renderGallery() {
    const gal = document.getElementById(containerId + '-gallery');
    if (!photos.length) { gal.innerHTML = '<p class="photo-empty">No photos yet — take or upload up to ' + maxPhotos + '</p>'; return; }
    gal.innerHTML = photos.map((p, i) => `
      <div class="photo-thumb-wrap">
        <img src="${p}" class="photo-thumb" alt="Photo ${i+1}">
        <button class="photo-remove" onclick="removePhoto('${containerId}',${i})" title="Remove">✕</button>
      </div>
    `).join('');
  }

  function addPhoto(dataUrl) {
    if (photos.length >= maxPhotos) { alert('Maximum ' + maxPhotos + ' photos. Remove one first.'); return; }
    photos.push(dataUrl);
    localStorage.setItem(storageKey, JSON.stringify(photos));
    renderGallery();
  }

  window['removePhoto'] = window['removePhoto'] || function(cid, idx) {
    const key = cid + '-photo';
    let p = JSON.parse(localStorage.getItem(key) || '[]');
    p.splice(idx, 1);
    localStorage.setItem(key, JSON.stringify(p));
    photos = p;
    renderGallery();
  };

  // Camera
  const cameraBtn = document.getElementById(containerId + '-cameraBtn');
  const cameraArea = document.getElementById(containerId + '-cameraArea');
  const video = document.getElementById(containerId + '-video');
  const captureBtn = document.getElementById(containerId + '-captureBtn');
  const switchBtn = document.getElementById(containerId + '-switchBtn');
  const closeBtn = document.getElementById(containerId + '-closeCam');

  async function startCamera() {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      video.srcObject = stream;
      cameraArea.style.display = 'block';
    } catch (err) {
      alert('Camera access denied or unavailable. Try uploading a photo instead.');
    }
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    cameraArea.style.display = 'none';
  }

  cameraBtn.addEventListener('click', startCamera);
  closeBtn.addEventListener('click', stopCamera);
  switchBtn.addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });

  captureBtn.addEventListener('click', () => {
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    addPhoto(c.toDataURL('image/jpeg', 0.85));
    stopCamera();
  });

  // File upload
  document.getElementById(containerId + '-fileInput').addEventListener('change', e => {
    Array.from(e.target.files).forEach(file => {
      if (photos.length >= maxPhotos) return;
      const reader = new FileReader();
      reader.onload = ev => addPhoto(ev.target.result);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  // Restore caption
  const captionEl = document.getElementById(containerId + '-caption');
  captionEl.value = localStorage.getItem(storageKey + '-caption') || '';
  captionEl.addEventListener('input', () => localStorage.setItem(storageKey + '-caption', captionEl.value));

  renderGallery();
  window['_photo_' + containerId] = { storageKey };
}

function submitPhotos(containerId) {
  const ref = window['_photo_' + containerId];
  if (!ref) return;
  const photos = JSON.parse(localStorage.getItem(ref.storageKey) || '[]');
  if (!photos.length) { alert('Please add at least one photo before submitting.'); return; }
  const caption = localStorage.getItem(ref.storageKey + '-caption') || '';
  const status = document.getElementById(containerId + '-status');
  const unitKey = document.body.dataset.unitKey || 'a';
  submitStudentWork({
    type: 'photo',
    title: 'Photo(s): ' + containerId,
    assignmentId: unitKey + '-' + containerId,
    content: caption || '(' + photos.length + ' photo(s) submitted)',
    attachmentCount: photos.length,
    attachmentType: 'image/jpeg'
  }).then(result => {
    if (status) {
      status.textContent = result.cloud ? '✅ Photos submitted to teacher!' : '✅ Photos saved locally';
      setTimeout(() => status.textContent = '', 4000);
    }
  });
}

// ===== SUBMISSION PIPELINE =====
// Central function for all student work submissions (Phase 7)
// Saves to localStorage + Firestore + optional Apps Script
async function submitStudentWork(opts) {
  const name = localStorage.getItem('g7-student-name') || 'Unknown';
  const email = localStorage.getItem('g7-student-email') || '';
  const unitKey = document.body.dataset.unitKey || 'a';
  const submission = {
    studentName: name,
    studentEmail: email,
    type: opts.type || 'written',
    title: opts.title || 'Student Work',
    assignmentId: opts.assignmentId || unitKey + '-submission',
    content: opts.content || '',
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
    attachmentType: opts.attachmentType || null,
    attachmentCount: opts.attachmentCount || 0
  };

  // Save to localStorage
  let subs = JSON.parse(localStorage.getItem('g7-submissions') || '[]');
  const existIdx = subs.findIndex(s => s.assignmentId === submission.assignmentId && s.studentEmail === email);
  if (existIdx >= 0) {
    submission.resubmission = true;
    submission.previousStatus = subs[existIdx].status;
    subs[existIdx] = submission;
  } else {
    subs.push(submission);
  }
  localStorage.setItem('g7-submissions', JSON.stringify(subs));

  // Sync to Firestore
  let cloud = false;
  try {
    if (typeof saveSubmission === 'function') {
      await saveSubmission(submission);
      cloud = true;
      console.log('[Submission] Saved to Firestore:', submission.title);
    }
  } catch(e) {
    console.warn('[Submission] Firestore save failed:', e.message);
  }

  // Also sync to Apps Script if configured
  try {
    if (typeof submitToTeacher === 'function') {
      submitToTeacher(submission);
    }
  } catch(e) {}

  return { success: true, cloud };
}

// ===== APPS SCRIPT SUBMISSION =====
const APPS_SCRIPT_URL = localStorage.getItem('g7-apps-script-url') || 'https://script.google.com/macros/s/AKfycbwhr5HmNc1_5RBukfLmNdR6kWn9z6czPd-2IXZY93pGvodyf4NnZcGIAxkYwrgnmWybXQ/exec';
async function submitToTeacher(payload) {
  if (!APPS_SCRIPT_URL) {
    console.log('Apps Script URL not configured. Saving locally.', payload);
    return { success: false, message: 'Submission endpoint not configured yet.' };
  }
  const name = localStorage.getItem('g7-student-name') || 'Unknown';
  const email = localStorage.getItem('g7-student-email') || '';
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ ...payload, studentName: name, studentEmail: email, timestamp: new Date().toISOString() })
    });
    return await resp.json();
  } catch (err) {
    console.error('Submission error:', err);
    return { success: false, message: err.message };
  }
}

// ===== INIT ON LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  checkSignIn();
  // Init Google Sign-In button (after a short delay to let GIS load)
  setTimeout(() => { try { initStudentGoogleSignIn(); } catch(e) {} }, 300);
  loadSavedText();
  initReadToMe();
  if (typeof updateLock === 'function') updateLock();
  // Restore saved activity completion state
  restoreActState();
  // Shift+T reveals teacher nav
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key === 'T') {
      const tn = document.getElementById('teacherNav');
      if (tn) tn.style.display = tn.style.display === 'none' ? '' : 'none';
    }
    // Ctrl+Shift+L = Teacher Unlock (Ctrl+Shift+U conflicts with Chrome)
    if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      e.preventDefault();
      toggleTeacherUnlock();
    }
  });
  // Auto-apply teacher unlock if already activated
  if (isTeacherUnlocked()) {
    setTimeout(() => applyTeacherUnlock(), 300);
  }
  // Console helper for teacher unlock
  window.teacherUnlock = toggleTeacherUnlock;
});
