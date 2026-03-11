/* ============================================================
   FIRESTORE DATA SERVICE — HPLN Grade 7 Science
   ============================================================
   CRUD operations for all Firestore collections.
   Handles dual-write: Firestore (source of truth) + localStorage (cache).
   Falls back to localStorage when offline or Firebase not configured.

   Collections:
   - users/{uid}            — user profiles & roles
   - studentProgress/{uid}  — lesson/unit completion state
   - grades/{uid}/items     — grade records
   - submissions/{id}       — assignment submissions
   - teacherNotes/{id}      — teacher notes about students

   Depends on: firebase-config.js, auth-service.js
   ============================================================ */

// ===== HELPERS =====
function _getDb() {
  return typeof getFirestore === 'function' ? getFirestore() : null;
}

function _getUserId() {
  if (typeof getCurrentUser === 'function') {
    const u = getCurrentUser();
    if (u && u.uid) return u.uid;
  }
  const email = localStorage.getItem('g7-student-email');
  if (email) return 'offline-' + email.replace(/[^a-z0-9]/gi, '_');
  return null;
}

function _serverTimestamp() {
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    return firebase.firestore.FieldValue.serverTimestamp();
  }
  return new Date().toISOString();
}

// ============================================================
// STUDENT PROGRESS
// ============================================================

/**
 * Save lesson completion to Firestore + localStorage.
 * @param {string} unitKey - e.g. 'a', 'b', 'c'
 * @param {number} lessonNum - lesson number
 * @param {boolean} passed - whether the lesson/quiz was passed
 */
async function saveProgress(unitKey, lessonNum, passed) {
  // Always write to localStorage (cache)
  if (passed) {
    localStorage.setItem(`g7-unit${unitKey}-lesson${lessonNum}-passed`, 'true');
  }

  // Write to Firestore if available
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) return;

  try {
    const progressRef = db.collection('studentProgress').doc(uid);

    // Get or create progress document
    const doc = await progressRef.get();
    let data = doc.exists ? doc.data() : {
      courseId: 'gr7-science',
      overallCompletion: 0,
      lastUpdated: _serverTimestamp()
    };

    // Initialize units map if needed
    if (!data.units) data.units = {};
    if (!data.units[unitKey]) {
      data.units[unitKey] = { lessonsCompleted: 0, lessonsPassed: [] };
    }

    // Update lesson data
    const unitData = data.units[unitKey];
    if (passed && !unitData.lessonsPassed.includes(lessonNum)) {
      unitData.lessonsPassed.push(lessonNum);
      unitData.lessonsCompleted = unitData.lessonsPassed.length;
    }

    // Recalculate overall completion
    const lessonCounts = { a: 8, b: 7, c: 6, d: 8, e: 7 };
    let totalPassed = 0, totalLessons = 0;
    Object.keys(lessonCounts).forEach(u => {
      totalLessons += lessonCounts[u];
      if (data.units[u]) totalPassed += (data.units[u].lessonsCompleted || 0);
    });
    data.overallCompletion = totalLessons > 0 ? Math.round(totalPassed / totalLessons * 100) : 0;
    data.lastUpdated = _serverTimestamp();

    await progressRef.set(data, { merge: true });
    console.log(`[Firestore] Progress saved: unit ${unitKey}, lesson ${lessonNum}`);
  } catch (e) {
    console.warn('[Firestore] Progress save failed:', e.message);
  }
}

/**
 * Restore lesson unlock state from Firestore → localStorage.
 * Call on page load to sync progress across devices.
 */
async function restoreProgressFromFirestore() {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) return;

  try {
    const doc = await db.collection('studentProgress').doc(uid).get();
    if (!doc.exists) return;
    const data = doc.data();
    if (!data.units) return;

    let restored = 0;
    for (const [unitKey, unitData] of Object.entries(data.units)) {
      if (unitData.lessonsPassed && unitData.lessonsPassed.length) {
        unitData.lessonsPassed.forEach(lessonNum => {
          const key = `g7-unit${unitKey}-lesson${lessonNum}-passed`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, 'true');
            restored++;
          }
        });
      }
    }
    if (restored > 0) {
      console.log(`[Firestore] Restored ${restored} lesson unlock(s) from cloud`);
      // Refresh sidebar locks if function exists
      if (typeof updateLock === 'function') updateLock();
    }
  } catch (e) {
    console.warn('[Firestore] Progress restore failed:', e.message);
  }
}

/**
 * Fetch full student progress from Firestore.
 * Falls back to localStorage if offline.
 * @returns {Object} { overallCompletion, units: { a: { lessonsCompleted, lessonsPassed[] }, ... } }
 */
async function getProgress() {
  const db = _getDb();
  const uid = _getUserId();

  if (db && uid) {
    try {
      const doc = await db.collection('studentProgress').doc(uid).get();
      if (doc.exists) return doc.data();
    } catch (e) {
      console.warn('[Firestore] Progress fetch failed, using localStorage:', e.message);
    }
  }

  // Fallback: reconstruct from localStorage
  const lessonCounts = { a: 8, b: 7, c: 6, d: 8, e: 7 };
  const units = {};
  let totalPassed = 0, totalLessons = 0;
  Object.keys(lessonCounts).forEach(u => {
    const count = lessonCounts[u];
    totalLessons += count;
    const passed = [];
    for (let i = 1; i <= count; i++) {
      if (localStorage.getItem(`g7-unit${u}-lesson${i}-passed`)) passed.push(i);
    }
    units[u] = { lessonsCompleted: passed.length, lessonsPassed: passed };
    totalPassed += passed.length;
  });

  return {
    courseId: 'gr7-science',
    overallCompletion: totalLessons > 0 ? Math.round(totalPassed / totalLessons * 100) : 0,
    units: units
  };
}

// ============================================================
// GRADES
// ============================================================

/**
 * Save a grade record. Dual-writes to Firestore and localStorage.
 * Matches the shape used by recordGrade() in shared.js.
 *
 * @param {Object} gradeRecord - { quizId, lessonTitle, score, total, percentage, passed, attempts, ... }
 */
async function saveGrade(gradeRecord) {
  const uid = _getUserId();
  const email = localStorage.getItem('g7-student-email') || '';
  const name = localStorage.getItem('g7-student-name') || '';

  // Ensure all fields
  const record = {
    email: email,
    name: name,
    quizId: gradeRecord.quizId || '',
    lessonTitle: gradeRecord.lessonTitle || '',
    score: gradeRecord.score || 0,
    total: gradeRecord.total || 0,
    percentage: gradeRecord.percentage || 0,
    passed: gradeRecord.passed || false,
    attempts: gradeRecord.attempts || 1,
    remediationUsed: gradeRecord.remediationUsed || false,
    timestamp: gradeRecord.timestamp || new Date().toISOString(),
    // Extended fields for full gradebook
    unit: gradeRecord.unit || '',
    category: gradeRecord.category || 'Formative Activities',
    type: gradeRecord.type || 'quiz',
    status: gradeRecord.status || 'Graded',
    feedback: gradeRecord.feedback || '',
    rubric: gradeRecord.rubric || null,
    strengths: gradeRecord.strengths || '',
    nextSteps: gradeRecord.nextSteps || ''
  };

  // 1. Write to localStorage (immediate, for current flow)
  let grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  const existing = grades.findIndex(g => g.email === email && g.quizId === record.quizId);
  if (existing >= 0) {
    record.attempts = (grades[existing].attempts || 1) + 1;
    if (record.percentage > grades[existing].percentage) {
      grades[existing] = record;
    } else {
      grades[existing].attempts = record.attempts;
    }
  } else {
    grades.push(record);
  }
  localStorage.setItem('g7-grades', JSON.stringify(grades));

  // 2. Write to Firestore
  const db = _getDb();
  if (!db || !uid) return;

  try {
    const itemRef = db.collection('grades').doc(uid)
      .collection('items').doc(record.quizId);

    const existingDoc = await itemRef.get();
    if (existingDoc.exists) {
      const prev = existingDoc.data();
      record.attempts = (prev.attempts || 1) + 1;
      if (record.percentage <= prev.percentage) {
        // Only update attempts count, keep best score
        await itemRef.update({
          attempts: record.attempts,
          lastAttempt: _serverTimestamp()
        });
        return;
      }
    }

    record.savedAt = _serverTimestamp();
    await itemRef.set(record, { merge: true });

    // Update summary doc
    await _updateGradeSummary(uid);
    console.log(`[Firestore] Grade saved: ${record.quizId} — ${record.percentage}%`);
  } catch (e) {
    console.warn('[Firestore] Grade save failed:', e.message);
  }
}

/**
 * Fetch all grade items for a student.
 * @param {string} studentUid - optional, defaults to current user
 * @returns {Array} grade records
 */
async function getGrades(studentUid) {
  const uid = studentUid || _getUserId();
  const db = _getDb();

  if (db && uid) {
    try {
      const snap = await db.collection('grades').doc(uid)
        .collection('items').orderBy('timestamp', 'desc').get();
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('[Firestore] Grades fetch failed, using localStorage:', e.message);
    }
  }

  // Fallback to localStorage
  return JSON.parse(localStorage.getItem('g7-grades') || '[]');
}

/**
 * Recalculate weighted grade summary for a student.
 */
async function _updateGradeSummary(uid) {
  const db = _getDb();
  if (!db || !uid) return;

  try {
    const snap = await db.collection('grades').doc(uid)
      .collection('items').get();

    const categories = {
      'Formative Activities': { weight: 0.10, scores: [] },
      'Assignments': { weight: 0.30, scores: [] },
      'Performance Tasks': { weight: 0.35, scores: [] },
      'Quizzes': { weight: 0.25, scores: [] }
    };

    snap.docs.forEach(d => {
      const item = d.data();
      const cat = item.category || 'Formative Activities';
      if (categories[cat] && typeof item.percentage === 'number') {
        categories[cat].scores.push(item.percentage);
      }
    });

    let weighted = 0;
    let totalWeight = 0;
    Object.values(categories).forEach(cat => {
      if (cat.scores.length > 0) {
        const avg = cat.scores.reduce((s, v) => s + v, 0) / cat.scores.length;
        weighted += avg * cat.weight;
        totalWeight += cat.weight;
      }
    });

    const overall = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
    const letter = overall >= 90 ? 'A+' : overall >= 85 ? 'A' : overall >= 80 ? 'A-' :
                   overall >= 77 ? 'B+' : overall >= 73 ? 'B' : overall >= 70 ? 'B-' :
                   overall >= 67 ? 'C+' : overall >= 63 ? 'C' : overall >= 60 ? 'C-' :
                   overall >= 50 ? 'D' : 'F';

    await db.collection('grades').doc(uid).set({
      courseId: 'gr7-science',
      overallWeighted: overall,
      letterGrade: letter,
      totalItems: snap.size,
      lastUpdated: _serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Grade summary update failed:', e.message);
  }
}

// ============================================================
// ACTIVITY RESULTS (sub-collection of progress)
// ============================================================

/**
 * Save an activity result (matching, sorting, etc.)
 */
async function saveActivityResult(unitKey, lessonNum, activityId, score, total, attempts) {
  // localStorage
  const key = `g7-activity-${unitKey}-l${lessonNum}-${activityId}`;
  localStorage.setItem(key, JSON.stringify({ score, total, attempts, timestamp: new Date().toISOString() }));

  // Firestore
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) return;

  try {
    await db.collection('studentProgress').doc(uid)
      .collection('activities').doc(`${unitKey}-l${lessonNum}-${activityId}`)
      .set({
        unitKey, lessonNum, activityId,
        score, total, attempts,
        firstAttemptScore: score,  // TODO: track first attempt separately
        percentage: total > 0 ? Math.round(score / total * 100) : 0,
        timestamp: _serverTimestamp()
      }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Activity save failed:', e.message);
  }
}

// ============================================================
// SUBMISSIONS
// ============================================================

/**
 * Create or update a student submission.
 */
async function saveSubmission(submissionData) {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) {
    // Offline: store in localStorage
    let subs = JSON.parse(localStorage.getItem('g7-submissions') || '[]');
    subs.push({ ...submissionData, studentId: uid, submittedAt: new Date().toISOString(), status: 'Submitted' });
    localStorage.setItem('g7-submissions', JSON.stringify(subs));
    return null;
  }

  try {
    const ref = db.collection('submissions').doc();
    await ref.set({
      ...submissionData,
      studentId: uid,
      courseId: 'gr7-science',
      submittedAt: _serverTimestamp(),
      status: 'Submitted'
    });
    console.log(`[Firestore] Submission saved: ${ref.id}`);
    return ref.id;
  } catch (e) {
    console.warn('[Firestore] Submission save failed:', e.message);
    return null;
  }
}

/**
 * Get submissions for the current student.
 */
async function getMySubmissions() {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) return JSON.parse(localStorage.getItem('g7-submissions') || '[]');

  try {
    const snap = await db.collection('submissions')
      .where('studentId', '==', uid)
      .orderBy('submittedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] Submissions fetch failed:', e.message);
    return [];
  }
}

/**
 * Get all submissions (teacher view).
 */
async function getAllSubmissions() {
  const db = _getDb();
  if (!db) return [];

  try {
    const snap = await db.collection('submissions')
      .orderBy('submittedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] All submissions fetch failed:', e.message);
    return [];
  }
}

// ============================================================
// TEACHER NOTES
// ============================================================

/**
 * Save a teacher note.
 */
async function saveTeacherNote(studentId, content, category) {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) {
    console.warn('[Firestore] Cannot save note — offline');
    return null;
  }

  try {
    const ref = db.collection('teacherNotes').doc();
    await ref.set({
      teacherId: uid,
      studentId: studentId,
      content: content,
      category: category || 'General',
      timestamp: _serverTimestamp()
    });
    console.log(`[Firestore] Note saved for student ${studentId}`);
    return ref.id;
  } catch (e) {
    console.warn('[Firestore] Note save failed:', e.message);
    return null;
  }
}

/**
 * Get teacher notes for a specific student.
 */
async function getTeacherNotes(studentId) {
  const db = _getDb();
  if (!db) return [];

  try {
    const snap = await db.collection('teacherNotes')
      .where('studentId', '==', studentId)
      .orderBy('timestamp', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] Notes fetch failed:', e.message);
    return [];
  }
}

// ============================================================
// CLASS DATA (Teacher views)
// ============================================================

/**
 * Get all student progress docs (teacher dashboard).
 */
async function getAllStudentProgress() {
  const db = _getDb();
  if (!db) return [];

  try {
    const snap = await db.collection('studentProgress').get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] All progress fetch failed:', e.message);
    return [];
  }
}

/**
 * Get all student grade summaries (teacher dashboard).
 */
async function getAllStudentGrades() {
  const db = _getDb();
  if (!db) return [];

  try {
    const snap = await db.collection('grades').get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] All grades fetch failed:', e.message);
    return [];
  }
}

/**
 * Get all enrolled users with role 'student'.
 */
async function getAllStudents() {
  const db = _getDb();
  if (!db) return [];

  try {
    const snap = await db.collection('users')
      .where('role', '==', 'student').get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] Students fetch failed:', e.message);
    return [];
  }
}

// ============================================================
// REAL-TIME LISTENERS (Teacher Dashboard)
// ============================================================

let _progressListener = null;

/**
 * Listen for real-time changes to student progress.
 * @param {Function} callback - Called with array of progress docs on each change
 * @returns {Function} unsubscribe function
 */
function listenToStudentProgress(callback) {
  const db = _getDb();
  if (!db) {
    console.warn('[Firestore] Cannot listen — offline');
    return () => {};
  }

  _progressListener = db.collection('studentProgress')
    .onSnapshot(snap => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      callback(data);
    }, err => {
      console.warn('[Firestore] Progress listener error:', err.message);
    });

  return _progressListener;
}

/**
 * Listen for real-time user sign-ins (for teacher dashboard).
 * @param {Function} callback - Called with array of user docs on each change
 * @returns {Function} unsubscribe function
 */
function listenToUserActivity(callback) {
  const db = _getDb();
  if (!db) return () => {};

  return db.collection('users')
    .where('role', '==', 'student')
    .orderBy('lastActive', 'desc')
    .onSnapshot(snap => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      callback(data);
    }, err => {
      console.warn('[Firestore] User activity listener error:', err.message);
    });
}

// ============================================================
// SUBMISSIONS
// ============================================================

/**
 * Save a student submission to Firestore.
 * @param {Object} submissionData - submission record
 */
async function saveSubmission(submissionData) {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) return;

  try {
    const doc = {
      ...submissionData,
      uid,
      submittedAt: _serverTimestamp(),
      updatedAt: _serverTimestamp()
    };
    // Use assignmentId + uid as a deterministic doc ID
    const docId = uid + '_' + (submissionData.assignmentId || Date.now());
    await db.collection('submissions').doc(docId).set(doc, { merge: true });
    console.log('[Firestore] Submission saved:', submissionData.title);
  } catch (e) {
    console.warn('[Firestore] Submission save failed:', e.message);
  }
}

/**
 * Update a submission's status (teacher review action).
 * @param {Object} submission - the submission object
 * @param {string} newStatus - 'Approved', 'Needs Revision', etc.
 */
async function updateSubmissionStatus(submission, newStatus) {
  const db = _getDb();
  if (!db || !submission) return;

  try {
    // Find the doc by querying
    const snap = await db.collection('submissions')
      .where('assignmentId', '==', submission.assignmentId || '')
      .where('studentEmail', '==', submission.studentEmail || submission.email || '')
      .limit(1).get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: newStatus,
        reviewedAt: _serverTimestamp(),
        reviewedBy: localStorage.getItem('g7-teacher-email') || 'teacher'
      });
      console.log('[Firestore] Submission status updated:', newStatus);
    }
  } catch (e) {
    console.warn('[Firestore] Submission status update failed:', e.message);
  }
}

// ============================================================
// TEACHER NOTES
// ============================================================

/**
 * Save a teacher note to Firestore.
 * @param {Object} noteData - { student, tag, text, date, teacher }
 */
async function saveTeacherNote(noteData) {
  const db = _getDb();
  if (!db) return;

  try {
    await db.collection('teacherNotes').add({
      ...noteData,
      createdAt: _serverTimestamp()
    });
    console.log('[Firestore] Teacher note saved');
  } catch (e) {
    console.warn('[Firestore] Teacher note save failed:', e.message);
  }
}

// ============================================================
// MIGRATION: localStorage → Firestore
// ============================================================

/**
 * Migrate existing localStorage data to Firestore.
 * Safe to call multiple times — uses merge writes.
 */
async function migrateLocalDataToFirestore() {
  const db = _getDb();
  const uid = _getUserId();
  if (!db || !uid) {
    console.log('[Migration] Skipped — Firestore not available');
    return;
  }

  console.log('[Migration] Starting localStorage → Firestore migration...');

  // 1. Migrate progress
  const lessonCounts = { a: 8, b: 7, c: 6, d: 8, e: 7 };
  for (const u of Object.keys(lessonCounts)) {
    for (let i = 1; i <= lessonCounts[u]; i++) {
      if (localStorage.getItem(`g7-unit${u}-lesson${i}-passed`)) {
        await saveProgress(u, i, true);
      }
    }
  }
  console.log('[Migration] ✓ Progress migrated');

  // 2. Migrate grades
  const grades = JSON.parse(localStorage.getItem('g7-grades') || '[]');
  for (const grade of grades) {
    await saveGrade(grade);
  }
  console.log(`[Migration] ✓ ${grades.length} grades migrated`);

  console.log('[Migration] Complete!');
}
