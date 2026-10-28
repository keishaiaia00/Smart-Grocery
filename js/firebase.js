// Firebase Realtime Synchronization Module for Smart Grocery PWA
// Architecture: Multi-Device Realtime Shared Workspace (1 Shared Cart between Phone & PC)
// Uses onSnapshot() for continuous bidirectional reactive sync (NO getDocs/getDoc one-shot polling)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  initializeFirestore,
  doc, 
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

// Shared document path for multi-device collaboration
const COLLECTION_NAME = "smart_grocery";
const DOCUMENT_ID = "shared_workspace";

// Generate unique ID per browser session / device to prevent echo loops
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
      // 1. Initialize Firebase App
      app = initializeApp(firebaseConfig);

      // 2. Initialize Firestore with auto-detect long polling for maximum network stability (mobile data/Indihome/Telkomsel)
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true
      });

      auth = getAuth(app);
      docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);

      this.updateStatus('connecting', 'Menghubungkan Cloud...');

      // 3. Attempt anonymous auth in case Firestore security rules require auth
      signInAnonymously(auth)
        .then(() => {
          console.log('[Firebase] Anonymous session active (multi-device shared)');
        })
        .catch((err) => {
          // If anonymous auth is disabled, public rules are used
          console.warn('[Firebase] Anonymous auth note:', err.message);
        });

      // 4. Start REALTIME listener (onSnapshot). STRICTLY NO getDocs()/getDoc()
      this.subscribeToChanges();

      // 5. Hook into local Storage mutations to push changes to Firestore
      if (window.Storage && typeof window.Storage.onChange === 'function') {
        window.Storage.onChange((source) => {
          if (source === 'local') {
            this.schedulePush();
          }
        });
      }

      // 6. Setup UI status element interaction
      this.setupUI();

      // 7. Network connectivity listeners for offline fallback & automatic reconnection
      window.addEventListener('online', () => {
        this.updateStatus('connecting', 'Menyambung kembali...');
        this.pushImmediate();
      });

      window.addEventListener('offline', () => {
        this.updateStatus('offline', 'Mode Offline (Lokal)');
      });

    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
      this.updateStatus('error', 'Gagal Inisialisasi');
    }
  },

  /**
   * PENTING: Menggunakan onSnapshot() untuk realtime streaming listener.
   * JANGAN gunakan getDoc() atau getDocs() karena hanya membaca sekali dan
   * tidak akan mendeteksi ketika barang diubah dari HP di supermarket.
   */
  subscribeToChanges() {
    if (!docRef) return;

    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        // Document doesn't exist in Firestore yet: Seed it with local data
        console.log('[Firebase] Dokumen shared belum ada di Firestore. Melakukan seeding data awal...');
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
            this.updateStatus('online', 'Realtime Sync Aktif');
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

      // Jika update berasal dari diri sendiri pada push terakhir, skip render ulang agar kursor tidak lompat
      if (isFromMe && !isInitialLoad) {
        this.lastSyncTime = new Date();
        this.updateStatus('online', 'Realtime Sync Aktif');
        return;
      }

      isInitialLoad = false;
      this.lastSyncTime = new Date();

      // Terapkan data cloud ke LocalStorage (sebagai fallback lokal) dan trigger re-render
      if (window.Storage && typeof window.Storage.applyCloudUpdate === 'function') {
        const hasChanged = window.Storage.applyCloudUpdate(remoteData);
        if (hasChanged && remoteData.clientId && remoteData.clientId !== CLIENT_ID) {
          if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast('Keranjang diperbarui realtime dari perangkat lain 📱💻', 'refresh-cw');
          }
        }
      }

      this.updateStatus('online', 'Realtime Sync Aktif');
    }, (error) => {
      console.error('[Firebase] Snapshot error:', error);
      this.handleFirebaseError(error);
    });
  },

  /**
   * Debounce push agar tidak membebani Firestore saat mengetik harga/nama atau menekan tombol qty
   */
  schedulePush() {
    this.updateStatus('syncing', 'Menyimpan ke Cloud...');
    if (pushTimeout) {
      clearTimeout(pushTimeout);
    }
    pushTimeout = setTimeout(() => {
      this.pushImmediate();
    }, 300);
  },

  /**
   * Menyimpan semua variabel wajib ke Firestore:
   * storeLocation, shoppingDate, walletLimit, items, totalSpent, totalSavings, catalog, history
   */
  async pushImmediate() {
    if (!docRef || !window.Storage) return;

    if (!navigator.onLine) {
      this.updateStatus('offline', 'Mode Offline (Lokal)');
      return;
    }

    try {
      this.updateStatus('syncing', 'Menyimpan...');
      const localData = window.Storage.getAllData();
      const timestamp = new Date().toISOString();
      lastPushedTimestamp = timestamp;

      await setDoc(docRef, {
        storeLocation: localData.storeLocation,
        shoppingDate: localData.shoppingDate,
        walletLimit: localData.walletLimit,
        budget: localData.budget,
        items: localData.items,
        cart: localData.cart,
        totalSpent: localData.totalSpent,
        totalSavings: localData.totalSavings,
        catalog: localData.catalog,
        history: localData.history,
        clientId: CLIENT_ID,
        lastUpdated: timestamp
      }, { merge: true });

      this.lastSyncTime = new Date();
      this.updateStatus('online', 'Realtime Sync Aktif');
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
      this.updateStatus('offline', 'Mode Offline (Lokal)');
    } else {
      this.updateStatus('error', 'Koneksi Cloud Terputus');
    }
  },

  updateStatus(status, message) {
    this.status = status;
    this.statusMessage = message;

    const pill = document.getElementById('cloudStatusPill');
    const textEl = document.getElementById('cloudStatusText');

    if (pill) {
      pill.className = `cloud-status-pill status-${status}`;
    }
    if (textEl) {
      textEl.textContent = message;
    }
    if (pill) {
      pill.setAttribute('title', `Firebase: ${message} (Klik untuk info & paksa sinkron)`);
    }
  },

  setupUI() {
    const pill = document.getElementById('cloudStatusPill');
    if (pill) {
      pill.addEventListener('click', () => {
        const lastSyncStr = this.lastSyncTime 
          ? this.lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
          : 'Belum ada';

        let info = `🔥 Firebase Firestore Realtime (Multi-Device Sync)\n\n`;
        info += `• Project ID: ${firebaseConfig.projectId}\n`;
        info += `• Koleksi/Dokumen: ${COLLECTION_NAME}/${DOCUMENT_ID}\n`;
        info += `• Metode: onSnapshot() Live Listener (Bukan getDoc)\n`;
        info += `• Status: ${this.statusMessage}\n`;
        info += `• Terakhir Sinkron: ${lastSyncStr}\n`;
        info += `• Fallback Offline: LocalStorage aktif (data tidak hilang saat F5)\n\n`;
        info += `Apakah ingin menyinkronkan ulang data sekarang?`;

        if (confirm(info)) {
          this.pushImmediate();
          if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast('Menyinkronkan data dengan Cloud Firestore...', 'cloud');
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
