/* ============================================================
   AUTH GUARD — HPLN Grade 7 Science
   ============================================================
   Reusable page-level access control.
   Checks auth state + role before showing page content.

   Depends on: firebase-config.js, auth-service.js
   ============================================================ */

/**
 * Guard a page that requires a specific role.
 * Hides the main content until auth is verified.
 * Shows a branded "Access Denied" screen for wrong roles.
 *
 * @param {Object} options
 * @param {string}   options.requiredRole    - 'student' | 'teacher' | 'admin'
 * @param {string}   options.contentId       - ID of the main content element to show/hide
 * @param {string}   options.gateId          - ID of the auth gate element (sign-in form)
 * @param {Function} options.onAuthorized    - Callback when user is verified & authorized
 * @param {string}   options.redirectUrl     - URL to redirect unauthorized users (optional)
 * @param {boolean}  options.allowManualCode - Allow manual access code fallback (for offline)
 * @param {string}   options.manualCode      - The access code for manual fallback
 */
function guardPage(options) {
  const {
    requiredRole = 'student',
    contentId = 'dashMain',
    gateId = 'authGate',
    onAuthorized = null,
    redirectUrl = null,
    allowManualCode = true,
    manualCode = null
  } = options;

  const content = document.getElementById(contentId);
  const gate = document.getElementById(gateId);

  // Hide content initially
  if (content) content.style.display = 'none';

  // ===== Check existing localStorage session =====
  function checkLocalSession() {
    if (requiredRole === 'teacher' || requiredRole === 'admin') {
      const tName = localStorage.getItem('g7-teacher-name');
      const tEmail = localStorage.getItem('g7-teacher-email');
      if (tName && tEmail) {
        _authorize(tName, tEmail, localStorage.getItem('g7-teacher-avatar') || '');
        return true;
      }
    } else {
      const sName = localStorage.getItem('g7-student-name');
      const sEmail = localStorage.getItem('g7-student-email');
      if (sName && sEmail) {
        _authorize(sName, sEmail, localStorage.getItem('g7-student-avatar') || '');
        return true;
      }
    }
    return false;
  }

  // ===== Try Firebase Auth =====
  function checkFirebaseAuth() {
    if (typeof onAuthStateChange !== 'function') return;
    onAuthStateChange(state => {
      if (!state.signedIn) {
        // Not signed in — show gate
        if (!checkLocalSession()) {
          if (gate) gate.style.display = 'flex';
        }
        return;
      }
      // Signed in — check role
      const role = state.role || getUserRole();
      if (_roleAllowed(role, requiredRole)) {
        const name = state.profile ? state.profile.displayName : '';
        const email = state.profile ? state.profile.email : '';
        const avatar = state.profile ? state.profile.avatar : '';
        _authorize(name, email, avatar);
      } else {
        _showAccessDenied(role, requiredRole);
      }
    });
  }

  // ===== Role check =====
  function _roleAllowed(userRole, required) {
    if (required === 'admin') return userRole === 'admin';
    if (required === 'teacher') return userRole === 'teacher' || userRole === 'admin';
    // 'student' — any signed-in role is fine
    return true;
  }

  // ===== Authorize =====
  function _authorize(name, email, avatar) {
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = '';
    if (onAuthorized) onAuthorized(name, email, avatar);
  }

  // ===== Access Denied =====
  function _showAccessDenied(userRole, required) {
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'none';

    // Check if access denied screen already exists
    if (document.getElementById('accessDenied')) return;

    const denied = document.createElement('div');
    denied.id = 'accessDenied';
    denied.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;font-family:Inter,sans-serif';
    denied.innerHTML = `
      <div>
        <div style="font-size:3rem;margin-bottom:12px">🔒</div>
        <h2 style="color:var(--text,#fff);margin-bottom:8px;font-family:Outfit,sans-serif">Access Restricted</h2>
        <p style="color:var(--text3,#888);margin-bottom:16px">
          This page requires <strong>${required}</strong> access.<br>
          ${userRole ? 'Your current role is: <strong>' + userRole + '</strong>' : 'Please sign in with an authorized account.'}
        </p>
        <a href="index.html" style="color:var(--accent,#4ade80);text-decoration:none;font-weight:600;font-size:.95rem">← Back to Home</a>
      </div>`;
    document.body.appendChild(denied);

    if (redirectUrl) {
      setTimeout(() => { window.location.href = redirectUrl; }, 3000);
    }
  }

  // ===== Manual code login (offline fallback for teachers) =====
  window.guardManualLogin = function(codeInput, nameInput) {
    if (!allowManualCode || !manualCode) {
      alert('Manual login is not available.');
      return;
    }
    if (codeInput === manualCode) {
      const name = nameInput || prompt('Enter your name:') || 'Teacher';
      localStorage.setItem('g7-teacher-name', name);
      localStorage.setItem('g7-teacher-email', 'teacher@hpln.ca');
      localStorage.setItem('g7-teacher-avatar', '');
      localStorage.setItem('g7-teacher-unlock', 'true');
      _authorize(name, 'teacher@hpln.ca', '');
    } else {
      alert('❌ Invalid access code.');
    }
  };

  // ===== Execute =====
  // 1. Try localStorage first (instant, no flicker)
  if (checkLocalSession()) return;

  // 2. Show gate while we check Firebase
  if (gate) gate.style.display = 'flex';

  // 3. Try Firebase auth
  checkFirebaseAuth();
}

/**
 * Quick helper to guard a student-only page.
 * Just checks if signed in (any role).
 */
function guardStudentPage(onReady) {
  const overlay = document.getElementById('signinOverlay');
  function check() {
    const name = localStorage.getItem('g7-student-name');
    const email = localStorage.getItem('g7-student-email');
    if (name && email) {
      if (overlay) overlay.style.display = 'none';
      if (onReady) onReady(name, email);
      return true;
    }
    if (overlay) overlay.style.display = 'flex';
    return false;
  }

  // Immediate check
  if (check()) return;

  // Firebase auth listener
  if (typeof onAuthStateChange === 'function') {
    onAuthStateChange(() => check());
  }

  // Poll for GIS callback
  let n = 0;
  const poll = setInterval(() => { if (check() || n++ > 20) clearInterval(poll); }, 500);
}
