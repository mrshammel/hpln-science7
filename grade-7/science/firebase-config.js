/* ============================================================
   FIREBASE CONFIG — HPLN Grade 7 Science
   ============================================================
   Central Firebase initialization module.
   All other modules import from here.

   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a new project (or use existing)
   3. Enable Authentication → Google provider
   4. Enable Cloud Firestore
   5. Go to Project Settings → General → Your Apps → Web App
   6. Copy config values below
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCvaqlYKvMy4t4F_zmy4Nckjql4_ezD47c",
  authDomain: "project-3c5c1cf6-7c84-4a5d-8fe.firebaseapp.com",
  projectId: "project-3c5c1cf6-7c84-4a5d-8fe",
  storageBucket: "project-3c5c1cf6-7c84-4a5d-8fe.firebasestorage.app",
  messagingSenderId: "487495658772",
  appId: "1:487495658772:web:8304e311380708f521e601"
};

// ===== Detect if config is placeholder =====
const FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY_HERE';

// ===== Initialize Firebase =====
let _firebaseApp = null;
let _firebaseAuth = null;
let _firebaseDb = null;

let _firebaseInitDone = false;

function initFirebase() {
  if (_firebaseInitDone) return true;
  if (!FIREBASE_CONFIGURED) {
    console.log('[Firebase] ⚠️ Config not set — running in OFFLINE mode.');
    return false;
  }
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK not loaded yet — will retry');
      _scheduleFirebaseRetry();
      return false;
    }
    // Initialize the app
    if (!firebase.apps.length) {
      _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      _firebaseApp = firebase.apps[0];
    }
    // Check if auth and firestore modules are available
    if (typeof firebase.auth !== 'function' || typeof firebase.firestore !== 'function') {
      console.warn('[Firebase] Auth/Firestore modules not ready — will retry');
      _scheduleFirebaseRetry();
      return false;
    }
    _firebaseAuth = firebase.auth();
    _firebaseDb = firebase.firestore();

    // Enable offline persistence for Firestore
    try {
      _firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function(){});
    } catch(e) {}

    _firebaseInitDone = true;
    console.log('[Firebase] ✓ Initialized — Auth + Firestore ready');

    // Trigger any queued syncs
    if (typeof _onFirebaseReady === 'function') {
      setTimeout(_onFirebaseReady, 100);
    }
    return true;
  } catch (e) {
    console.warn('[Firebase] Init attempt failed:', e.message);
    _scheduleFirebaseRetry();
    return false;
  }
}

// Retry init up to 15 times (3 seconds total)
let _firebaseRetryCount = 0;
function _scheduleFirebaseRetry() {
  if (_firebaseRetryCount >= 15 || _firebaseInitDone) return;
  _firebaseRetryCount++;
  setTimeout(function() {
    if (!_firebaseInitDone) initFirebase();
  }, 200);
}

// ===== Getters =====
function getFirebaseAuth() { return _firebaseAuth; }
function getFirestore() { return _firebaseDb; }
function isFirebaseReady() { return FIREBASE_CONFIGURED && !!_firebaseAuth; }
