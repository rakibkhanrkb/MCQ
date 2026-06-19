import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function clear() {
  const snap = await getDocs(collection(db, 'questions'));
  const batchSize = 400;
  
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(i, i + batchSize);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log('Cleared all previous questions.');
}

clear().catch(console.error);
