import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initializing Firestore with local persistent caching to dramatically reduce database read count and speed up loading.
// We force long polling to bypass WebSocket restrictions in sandboxed/iframe environments.
const firestoreSettings = {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

export const db = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)')
  ? initializeFirestore(app, firestoreSettings)
  : initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId); 

export const auth = getAuth(app);

// Firebase instance is ready to use

