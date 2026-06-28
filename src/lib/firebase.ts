import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initializing Firestore with the database ID specified in your configuration
// We force long polling to bypass WebSocket restrictions in sandboxed/iframe environments
export const db = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)')
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId); 

export const auth = getAuth(app);

// Firebase instance is ready to use

