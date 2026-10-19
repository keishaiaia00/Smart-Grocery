// Firebase Realtime Synchronization Module for Smart Grocery PWA
// Architecture: Single Shared User / Shared Workspace (1 User untuk semua perangkat)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyBs3dsNs5EB9xIwID63tg4rMSElUUpXtE8",
  authDomain: "smart-grocery-d5a97.firebaseapp.com",
  projectId: "smart-grocery-d5a97",
  storageBucket: "smart-grocery-d5a97.firebasestorage.app",
  messagingSenderId: "852021544432",
  appId: "1:852021544432:web:f0bb3c52040177aeae8935"
};

// Shared single-user workspace document path
const COLLECTION_NAME = "smart_grocery";
const DOCUMENT_ID = "shared_workspace";

// Generate unique ID per browser session to prevent echo loops
const CLIENT_ID = 'client-' + Math.random().toString(36).substring(2, 9);

let app = null;
let db = null;
let auth = null;
let docRef = null;
let unsubscribeSnapshot = null;
let pushTimeout = null;
let lastPushedTimestamp = null;
let isInitialLoad = true;

const FirebaseSync = {
  status: 'connecting', // 'connecting' | 'online' | 'syncing' | 'offline' | 'error'
  statusMessage: 'Menghubungkan...',
  lastSyncTime: null,

  init() {
    try {
      // Initialize Firebase App
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);

      this.updateStatus('connecting', 'Menghubungkan...');

      // Attempt anonymous auth in case Firestore security rules require auth
      signInAnonymously(auth)
        .then(() => {
          console.log('[Firebase] Anonymous auth active (1 user shared)');
        })
        .catch((err) => {
          // If anonymous auth is not enabled in Firebase Console, rules might be open (public)
          console.warn('[Firebase] Anonymous sign-in note:', err.message);
        });

      // Start listening to real-time changes
      this.subscribeToChanges();

      // Hook into local Storage changes to push to cloud
      if (window.Storage && typeof window.Storage.onChange === 'function') {
        window.Storage.onChange((source) => {
          if (source === 'local') {
            this.schedulePush();
          }
        });
      }

      // Setup UI status element interaction
      this.setupUI();

      // Listen to browser network changes
      window.addEventListener('online', () => {
        this.updateStatus('connecting', 'Tersambung kembali...');
        this.pushImmediate();
      });

      window.addEventListener('offline', () => {
        this.updateStatus('offline', 'Mode Offline');
      });

    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
      this.updateStatus('error', 'Gagal Inisialisasi');
    }
  },

  subscribeToChanges() {
    if (!docRef) return;

    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        // Document doesn't exist in Firestore yet: Seed it with default local data
        console.log('[Firebase] Dokumen shared belum ada di Firestore. Melakukan seeding pertama...');
        this.updateStatus('syncing', 'Menyiapkan Cloud...');
        
        const initialData = window.Storage ? window.Storage.getAllData() : null;
        if (initialData) {
          const timestamp = new Date().toISOString();
          lastPushedTimestamp = timestamp;
          setDoc(docRef, {
            ...initialData,
            clientId: CLIENT_ID,
            lastUpdated: timestamp,
            createdAt: timestamp
          }).then(() => {
            this.lastSyncTime = new Date();
            this.updateStatus('online', '1 User Synced');
            console.log('[Firebase] Seeding Firestore sukses!');
          }).catch((err) => {
            console.error('[Firebase] Gagal seeding Firestore:', err);
            this.handleFirebaseError(err);
          });
        }
        return;
      }

      const remoteData = docSnap.data();
      const isFromMe = (remoteData.clientId === CLIENT_ID && remoteData.lastUpdated === lastPushedTimestamp);

      // If update was from this client's own recent push, skip applying to prevent cursor jumps
      if (isFromMe && !isInitialLoad) {
        this.lastSyncTime = new Date();
        this.updateStatus('online', '1 User Synced');
        return;
      }

      isInitialLoad = false;
      this.lastSyncTime = new Date();

      if (window.Storage && typeof window.Storage.applyCloudUpdate === 'function') {
        const hasChanged = window.Storage.applyCloudUpdate(remoteData);
        if (hasChanged && remoteData.clientId && remoteData.clientId !== CLIENT_ID) {
          if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast('Data belanja disinkronkan dari cloud', 'refresh-cw');
          }
        }
      }

      this.updateStatus('online', '1 User Synced');
    }, (error) => {
      console.error('[Firebase] Snapshot error:', error);
      this.handleFirebaseError(error);
    });
  },

  schedulePush() {
    this.updateStatus('syncing', 'Menyimpan...');
    if (pushTimeout) {
      clearTimeout(pushTimeout);
    }
    // Debounce 350ms to prevent spamming Firestore when typing or tapping counters
    pushTimeout = setTimeout(() => {
      this.pushImmediate();
    }, 350);
  },

  async pushImmediate() {
    if (!docRef || !window.Storage) return;

    if (!navigator.onLine) {
      this.updateStatus('offline', 'Mode Offline');
      return;
    }

    try {
      this.updateStatus('syncing', 'Menyimpan...');
      const localData = window.Storage.getAllData();
      const timestamp = new Date().toISOString();
      lastPushedTimestamp = timestamp;

      await setDoc(docRef, {
        budget: localData.budget,
        cart: localData.cart,
        catalog: localData.catalog,
        history: localData.history,
        clientId: CLIENT_ID,
        lastUpdated: timestamp
      }, { merge: true });

      this.lastSyncTime = new Date();
      this.updateStatus('online', '1 User Synced');
    } catch (err) {
      console.error('[Firebase] Push data error:', err);
      this.handleFirebaseError(err);
    }
  },

  handleFirebaseError(err) {
    if (err && (err.code === 'permission-denied' || String(err).includes('permission-denied'))) {
      this.updateStatus('error', 'Izin Ditolak (Rules)');
      console.warn('[Firebase] Harap pastikan Firestore Security Rules mengizinkan baca/tulis:\n' +
                   'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} { allow read, write: if true; }\n  }\n}');
    } else if (!navigator.onLine) {
      this.updateStatus('offline', 'Mode Offline');
    } else {
      this.updateStatus('error', 'Koneksi Cloud Terputus');
    }
  },

  updateStatus(status, message) {
    this.status = status;
    this.statusMessage = message;

    const pill = document.getElementById('cloudStatusPill');
    const textEl = document.getElementById('cloudStatusText');
    const dotEl = document.querySelector('.cloud-status-dot');

    if (pill) {
      pill.className = `cloud-status-pill status-${status}`;
    }
    if (textEl) {
      textEl.textContent = message;
    }
    if (pill) {
      pill.setAttribute('title', `Firebase: ${message} (Klik untuk info)`);
    }
  },

  setupUI() {
    const pill = document.getElementById('cloudStatusPill');
    if (pill) {
      pill.addEventListener('click', () => {
        const lastSyncStr = this.lastSyncTime 
          ? this.lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
          : 'Belum ada';

        let info = `🔥 Firebase Cloud Sync (1 User Terbagi)\n\n`;
        info += `• Project ID: ${firebaseConfig.projectId}\n`;
        info += `• Dokumen: ${COLLECTION_NAME}/${DOCUMENT_ID}\n`;
        info += `• Status: ${this.statusMessage}\n`;
        info += `• Sinkron Terakhir: ${lastSyncStr}\n`;
        info += `• Model: Semua yang membuka app terhubung ke 1 data bersama tanpa login.\n\n`;
        info += `Apakah ingin melakukan sinkronisasi ulang sekarang?`;

        if (confirm(info)) {
          this.pushImmediate();
          if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast('Menyinkronkan data dengan Firebase...', 'cloud');
          }
        }
      });
    }
  }
};

// Export to window so non-module scripts can access if needed
window.FirebaseSync = FirebaseSync;

// Auto initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FirebaseSync.init());
} else {
  FirebaseSync.init();
}
