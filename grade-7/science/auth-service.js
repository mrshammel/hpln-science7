/* ============================================================
   AUTH SERVICE — HPLN Grade 7 Science
   ============================================================
   Centralized authentication module.
   Handles sign-in, sign-out, auth state, and role management.
   
   Depends on: firebase-config.js (must be loaded first)
   ============================================================ */

// ===== STATE =====
let _currentUser = null;       // Firebase Auth user object
let _userProfile = null;       // Firestore user profile { role, displayName, ... }
let _authReady = false;        // True after first auth state check
let _authCallbacks = [];       // Registered callbacks for auth state changes

// ===== CONSTANTS =====
const ROLES = { STUDENT: 'student', TEACHER: 'teacher', ADMIN: 'admin' };

// Emails that auto-receive teacher role on first sign-in
const TEACHER_EMAILS = [
  'amanda.shammel@hpln.ca',
  'admin@hpln.ca',
  'amanda.yaremchuk@gmail.com',
  'amandahammel@prrd8.ca',
  'coreysteeves@prrd8.ca',
  'hammel1610@gmail.com'
];

// ===== INIT =====
/**
 * Initialize the auth service. Call after initFirebase().
 * Sets up onAuthStateChanged listener for session persistence.
 */
function initAuthService() {
  if (!isFirebaseReady()) {
    console.log('[Auth] Firebase not ready — using offline auth');
    _authReady = true;
    _checkOfflineAuth();
    return;
  }

  const auth = getFirebaseAuth();
  let _hadFirebaseUser = false;  // Track if we ever had a Firebase Auth user

  auth.onAuthStateChanged(async (user) => {
    _currentUser = user;
    if (user) {
      _hadFirebaseUser = true;
      // Sync profile to Firestore
      _userProfile = await _ensureUserProfile(user);
      // Cache to localStorage for offline/quick access
      _cacheUserLocally(user, _userProfile);
      console.log(`[Auth] Signed in: ${user.displayName} (${_userProfile.role})`);
    } else {
      _userProfile = null;
      // ONLY clear localStorage if user explicitly signed out of Firebase Auth
      // Do NOT clear if this is just a fresh page load with no Firebase session
      // (students sign in via GIS which uses localStorage, not Firebase Auth)
      if (_hadFirebaseUser) {
        _clearLocalCache();
        _hadFirebaseUser = false;
        console.log('[Auth] Signed out — cleared session');
      } else {
        // No Firebase user, but check for GIS/localStorage session
        _checkOfflineAuth();
        console.log('[Auth] No Firebase session — checking localStorage');
      }
    }
    _authReady = true;
    _notifyAuthCallbacks();
  });
}

// ===== SIGN IN =====
/**
 * Sign in with Google popup via Firebase Auth.
 * Returns the user on success, null on failure.
 */
async function signInWithGoogle() {
  if (!isFirebaseReady()) {
    // Offline fallback
    return _offlineSignIn();
  }
  try {
    const auth = getFirebaseAuth();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user') {
      console.log('[Auth] Sign-in cancelled by user');
      return null;
    }
    console.error('[Auth] Sign-in failed:', e.message);
    // Fall back to offline sign-in
    return _offlineSignIn();
  }
}

/**
 * Sign out the current user.
 */
async function signOut() {
  if (isFirebaseReady()) {
    try { await getFirebaseAuth().signOut(); } catch (e) { console.warn('[Auth] Sign-out error:', e.message); }
  }
  _currentUser = null;
  _userProfile = null;
  _clearLocalCache();
  _notifyAuthCallbacks();
}

// ===== ROLE CHECKS =====
function getCurrentUser() { return _currentUser; }
function getUserProfile() { return _userProfile; }
function isSignedIn() { return !!_currentUser || !!localStorage.getItem('g7-student-email'); }
function isAuthReady() { return _authReady; }

function getUserRole() {
  if (_userProfile) return _userProfile.role;
  // Offline fallback
  if (localStorage.getItem('g7-teacher-unlock') === 'true') return ROLES.TEACHER;
  if (localStorage.getItem('g7-student-email')) return ROLES.STUDENT;
  return null;
}

function isTeacher() { return getUserRole() === ROLES.TEACHER || getUserRole() === ROLES.ADMIN; }
function isAdmin() { return getUserRole() === ROLES.ADMIN; }
function isStudent() { return getUserRole() === ROLES.STUDENT; }

// ===== AUTH STATE CALLBACKS =====
/**
 * Register a callback to be called when auth state changes.
 * Callback receives: { user, profile, role, signedIn }
 */
function onAuthStateChange(callback) {
  _authCallbacks.push(callback);
  // If auth is already resolved, call immediately
  if (_authReady) {
    callback(_getAuthState());
  }
}

function _getAuthState() {
  return {
    user: _currentUser,
    profile: _userProfile,
    role: getUserRole(),
    signedIn: isSignedIn()
  };
}

function _notifyAuthCallbacks() {
  const state = _getAuthState();
  _authCallbacks.forEach(cb => {
    try { cb(state); } catch (e) { console.error('[Auth] Callback error:', e); }
  });
}

// ===== FIRESTORE PROFILE =====
/**
 * Ensure a user profile document exists in Firestore.
 * Creates one on first sign-in with the appropriate role.
 */
async function _ensureUserProfile(user) {
  const db = getFirestore();
  if (!db) return _buildOfflineProfile(user);

  const docRef = db.collection('users').doc(user.uid);
  try {
    const doc = await docRef.get();
    if (doc.exists) {
      // Update last active
      await docRef.update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        displayName: user.displayName || doc.data().displayName,
        avatar: user.photoURL || doc.data().avatar || ''
      });
      return doc.data();
    } else {
      // First sign-in — create profile
      const role = _determineRole(user.email);
      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        avatar: user.photoURL || '',
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(profile);
      console.log(`[Auth] Created new ${role} profile for ${user.email}`);
      return profile;
    }
  } catch (e) {
    console.warn('[Auth] Firestore profile error:', e.message);
    return _buildOfflineProfile(user);
  }
}

function _determineRole(email) {
  if (!email) return ROLES.STUDENT;
  const lower = email.toLowerCase();
  if (TEACHER_EMAILS.some(t => t.toLowerCase() === lower)) return ROLES.TEACHER;
  return ROLES.STUDENT;
}

function _buildOfflineProfile(user) {
  return {
    uid: user ? user.uid : 'offline',
    email: user ? user.email : localStorage.getItem('g7-student-email') || '',
    displayName: user ? user.displayName : localStorage.getItem('g7-student-name') || 'Student',
    avatar: user ? user.photoURL : localStorage.getItem('g7-student-avatar') || '',
    role: _determineRole(user ? user.email : localStorage.getItem('g7-student-email'))
  };
}

// ===== LOCAL CACHE =====
function _cacheUserLocally(user, profile) {
  if (!user) return;
  localStorage.setItem('g7-student-name', user.displayName || '');
  localStorage.setItem('g7-student-email', user.email || '');
  localStorage.setItem('g7-student-avatar', user.photoURL || '');
  // Legacy keys for backward compatibility
  localStorage.setItem('g7-student', user.displayName || '');
  localStorage.setItem('g7-email', user.email || '');
  localStorage.setItem('g7-avatar', user.photoURL || '');
  if (profile && profile.role === ROLES.TEACHER) {
    localStorage.setItem('g7-teacher-name', user.displayName || '');
    localStorage.setItem('g7-teacher-email', user.email || '');
    localStorage.setItem('g7-teacher-avatar', user.photoURL || '');
    localStorage.setItem('g7-teacher-unlock', 'true');
  }
}

function _clearLocalCache() {
  ['g7-student-name','g7-student-email','g7-student-avatar',
   'g7-student','g7-email','g7-avatar',
   'g7-teacher-name','g7-teacher-email','g7-teacher-avatar','g7-teacher-unlock'
  ].forEach(k => localStorage.removeItem(k));
}

// ===== OFFLINE FALLBACK =====
function _checkOfflineAuth() {
  const name = localStorage.getItem('g7-student-name');
  const email = localStorage.getItem('g7-student-email');
  if (name && email) {
    _userProfile = {
      uid: 'offline-' + email.replace(/[^a-z0-9]/gi, '_'),
      email: email,
      displayName: name,
      avatar: localStorage.getItem('g7-student-avatar') || '',
      role: localStorage.getItem('g7-teacher-unlock') === 'true' ? ROLES.TEACHER : ROLES.STUDENT
    };
  }
  _notifyAuthCallbacks();
}

async function _offlineSignIn() {
  const name = prompt('Enter your full name (First Last):');
  if (!name || !name.trim()) return null;
  const email = prompt('Enter your school email:');
  if (!email || !email.trim()) return null;

  localStorage.setItem('g7-student-name', name.trim());
  localStorage.setItem('g7-student-email', email.trim());
  localStorage.setItem('g7-student', name.trim());
  localStorage.setItem('g7-email', email.trim());

  _userProfile = {
    uid: 'offline-' + email.trim().replace(/[^a-z0-9]/gi, '_'),
    email: email.trim(),
    displayName: name.trim(),
    avatar: '',
    role: ROLES.STUDENT
  };
  _authReady = true;
  _notifyAuthCallbacks();
  return _userProfile;
}

// ===== AUTH GUARD =====
/**
 * Require authentication to view a page.
 * Shows sign-in overlay if not authenticated.
 * @param {string} requiredRole - Optional role requirement ('teacher', 'admin')
 * @param {string} redirectUrl - URL to redirect to if role requirement not met
 */
function requireAuth(requiredRole, redirectUrl) {
  onAuthStateChange(state => {
    const overlay = document.getElementById('signinOverlay');
    if (!state.signedIn) {
      // Show sign-in overlay
      if (overlay) overlay.style.display = 'flex';
      return;
    }
    // Signed in — hide overlay
    if (overlay) overlay.style.display = 'none';

    // Check role if required
    if (requiredRole && state.role !== requiredRole && state.role !== ROLES.ADMIN) {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;font-family:Inter,sans-serif">
            <div>
              <div style="font-size:3rem;margin-bottom:12px">🔒</div>
              <h2 style="margin-bottom:8px">Access Restricted</h2>
              <p style="color:#888;margin-bottom:16px">This page requires ${requiredRole} access.</p>
              <a href="index.html" style="color:#4ade80;text-decoration:none;font-weight:600">← Back to Home</a>
            </div>
          </div>`;
      }
    }

    // Update student display
    _updateStudentDisplay(state);
  });
}

function _updateStudentDisplay(state) {
  const el = document.getElementById('studentDisplay');
  if (el && state.signedIn) {
    const name = state.profile ? state.profile.displayName : localStorage.getItem('g7-student-name') || '';
    el.innerHTML = `<span style="opacity:.7">👋</span> ${name}`;
  }
}
