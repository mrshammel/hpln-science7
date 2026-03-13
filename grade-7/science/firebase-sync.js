/* ============================================================
   FIREBASE SYNC MODULE — HPLN Grade 7 Science
   ============================================================
   Syncs student progress to Firebase Realtime Database so
   the teacher dashboard can show live data.
   ============================================================ */

// ===== FIREBASE CONFIG =====
// REPLACE THIS with your actual Firebase config from console.firebase.google.com
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

let _fbApp = null;
let _fbDb = null;
let _fbReady = false;

// ===== INIT =====
function initFirebaseSync() {
  // Don't init on file:// protocol or if config not set
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.log('[Firebase] Config not set — running in offline mode');
    return;
  }
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK not loaded');
      return;
    }
    if (!firebase.apps.length) {
      _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      _fbApp = firebase.apps[0];
    }
    _fbDb = firebase.database();
    _fbReady = true;
    console.log('[Firebase] Connected ✓');

    // Monitor connection state
    _fbDb.ref('.info/connected').on('value', function(snap) {
      const connected = snap.val() === true;
      document.dispatchEvent(new CustomEvent('firebase-connection', { detail: { connected } }));
    });
  } catch (e) {
    console.warn('[Firebase] Init failed:', e.message);
    _fbReady = false;
  }
}

// ===== HELPERS =====
function emailToKey(email) {
  // Firebase keys can't contain . # $ [ ] /
  return (email || 'unknown').replace(/[.#$\[\]\/]/g, '_');
}

function getStudentEmail() {
  return localStorage.getItem('g7-email') || localStorage.getItem('g7-student-email') || '';
}
function getStudentName() {
  return localStorage.getItem('g7-student') || localStorage.getItem('g7-student-name') || 'Unknown';
}
function getStudentAvatar() {
  return localStorage.getItem('g7-avatar') || localStorage.getItem('g7-student-avatar') || '';
}

function getUnitId() {
  // Detect which unit page we're on from the URL
  const path = window.location.pathname.toLowerCase();
  if (path.includes('unit-a') || path.includes('ecosystems')) return 'A';
  if (path.includes('unit-b') || path.includes('plants')) return 'B';
  if (path.includes('unit-c') || path.includes('heat')) return 'C';
  if (path.includes('unit-d') || path.includes('structures')) return 'D';
  if (path.includes('unit-e') || path.includes('earth')) return 'E';
  return null;
}

function nowISO() { return new Date().toISOString(); }

// ===== SYNC: STUDENT LOGIN =====
function syncStudentLogin(name, email, avatar) {
  if (!_fbReady || !email) return;
  const key = emailToKey(email);
  const updates = {};
  updates['students/' + key + '/name'] = name || 'Unknown';
  updates['students/' + key + '/email'] = email;
  updates['students/' + key + '/avatar'] = avatar || '';
  updates['students/' + key + '/lastActive'] = nowISO();
  updates['students/' + key + '/signedIn'] = true;
  try { _fbDb.ref().update(updates); } catch (e) { console.warn('[Firebase] Login sync failed:', e.message); }
}

// ===== SYNC: STUDENT SIGN OUT =====
function syncStudentSignOut(email) {
  if (!_fbReady || !email) return;
  const key = emailToKey(email);
  try {
    _fbDb.ref('students/' + key).update({ signedIn: false, lastActive: nowISO() });
  } catch (e) { console.warn('[Firebase] SignOut sync failed:', e.message); }
}

// ===== SYNC: ACTIVITY RESULT =====
function syncActivityResult(unit, lesson, actId, score, total) {
  if (!_fbReady) return;
  const email = getStudentEmail();
  if (!email) return;
  const key = emailToKey(email);
  const path = 'students/' + key + '/units/' + unit + '/lesson' + lesson + '/activities/' + actId;
  try {
    _fbDb.ref(path).transaction(function(current) {
      // Only update if first attempt OR new score is lower (preserve authentic first attempt)
      if (!current) {
        return { score: score, total: total, attempts: 1, timestamp: nowISO() };
      }
      // Record additional attempt but keep first score
      return {
        score: current.score,  // Keep first-attempt score
        total: total,
        attempts: (current.attempts || 1) + 1,
        firstScore: current.firstScore || current.score,
        latestScore: score,
        timestamp: nowISO()
      };
    });
    // Update last active
    _fbDb.ref('students/' + key + '/lastActive').set(nowISO());
  } catch (e) { console.warn('[Firebase] Activity sync failed:', e.message); }
}

// ===== SYNC: QUIZ RESULT =====
function syncQuizResult(unit, quizNum, score, total, passed) {
  if (!_fbReady) return;
  const email = getStudentEmail();
  if (!email) return;
  const key = emailToKey(email);
  const path = 'students/' + key + '/units/' + unit + '/lesson' + quizNum + '/quiz';
  try {
    _fbDb.ref(path).transaction(function(current) {
      if (!current) {
        return { score: score, total: total, passed: passed, attempts: 1, firstScore: score, timestamp: nowISO() };
      }
      return {
        score: passed ? Math.max(current.score || 0, score) : current.score || score,
        total: total,
        passed: current.passed || passed,
        attempts: (current.attempts || 1) + 1,
        firstScore: current.firstScore || current.score || score,
        latestScore: score,
        timestamp: nowISO()
      };
    });
    // Update last active
    _fbDb.ref('students/' + key + '/lastActive').set(nowISO());
  } catch (e) { console.warn('[Firebase] Quiz sync failed:', e.message); }
}

// ===== SYNC: LESSON PASSED =====
function syncLessonPassed(unit, lessonNum) {
  if (!_fbReady) return;
  const email = getStudentEmail();
  if (!email) return;
  const key = emailToKey(email);
  try {
    _fbDb.ref('students/' + key + '/units/' + unit + '/lesson' + lessonNum + '/passed').set(true);
    _fbDb.ref('students/' + key + '/lastActive').set(nowISO());
  } catch (e) { console.warn('[Firebase] Lesson sync failed:', e.message); }
}

// ===== SYNC: HEARTBEAT (call periodically while student is active) =====
function syncHeartbeat() {
  if (!_fbReady) return;
  const email = getStudentEmail();
  if (!email) return;
  const key = emailToKey(email);
  try { _fbDb.ref('students/' + key + '/lastActive').set(nowISO()); } catch (e) {}
}

// ===== DASHBOARD: LISTEN FOR ALL STUDENTS =====
function listenForStudents(callback) {
  if (!_fbReady) { callback(null); return; }
  try {
    _fbDb.ref('students').on('value', function(snap) {
      callback(snap.val());
    });
  } catch (e) {
    console.warn('[Firebase] Listen failed:', e.message);
    callback(null);
  }
}

// ===== GLOBAL markActivityDone — syncs to Firebase =====
// Called by all unit pages: markActivityDone(lessonNum, actId, score, total)
function markActivityDone(lessonNum, actId, score, total) {
  if (!_fbReady) return;
  var unit = getUnitId();
  if (!unit) return;
  syncActivityResult(unit, lessonNum, actId, score, total);
}

// ===== Hook into lesson-passed localStorage writes =====
// Watch for quiz completion by monitoring localStorage changes
(function() {
  var _origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    _origSetItem.call(this, key, value);
    // Detect lesson-passed keys: g7-unitX-lessonN-passed
    if (key && key.match && key.match(/g7-unit[a-e]-lesson\d+-passed/i) && value === 'true') {
      var unitMatch = key.match(/g7-unit([a-e])/i);
      var lessonMatch = key.match(/lesson(\d+)/i);
      if (unitMatch && lessonMatch) {
        try { syncLessonPassed(unitMatch[1].toUpperCase(), parseInt(lessonMatch[1])); } catch(e) {}
      }
    }
  };
})();

// ===== AUTO-INIT on DOM ready =====
document.addEventListener('DOMContentLoaded', function() {
  initFirebaseSync();
  // Heartbeat every 2 minutes while page is open
  if (_fbReady) {
    setInterval(syncHeartbeat, 120000);
  }
});
