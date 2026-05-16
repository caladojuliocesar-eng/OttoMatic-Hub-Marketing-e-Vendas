// ═══════════════════════════════════════════════════════
//  OTTOMATIC HUB — Firebase Centralizado
//
//  Single-source-of-truth para todas as instâncias Firebase.
//  Módulos (CRM, Calendário) importam daqui em vez de
//  inicializar o Firebase por conta própria.
// ═══════════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAiPUyfbkof-rTN2GrtwDirVhwUlWfI-c0",
  authDomain: "ottomatic-hub.firebaseapp.com",
  projectId: "ottomatic-hub",
  storageBucket: "ottomatic-hub.firebasestorage.app",
  messagingSenderId: "76318663409",
  appId: "1:76318663409:web:059854803d548126daff50"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App ID usado como namespace no Firestore (padrão Canvas)
const hubAppId = 'ottomatic-hub';

export { app, auth, db, hubAppId, signInAnonymously, onAuthStateChanged };
