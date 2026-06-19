import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function finalSeed() {
  console.log('Combining all 100 long-form questions...');
  
  const allQuestions: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), `batch${i}.json`), 'utf-8'));
    allQuestions.push(...data);
  }

  console.log(`Ready to insert ${allQuestions.length} full-text questions.`);
  
  const batchSize = 400;
  for (let i = 0; i < allQuestions.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = allQuestions.slice(i, i + batchSize);
    
    chunk.forEach((q: any) => {
      const qRef = doc(collection(db, 'questions'));
      batch.set(qRef, {
        ...q,
        createdAt: new Date()
      });
    });
    
    await batch.commit();
    console.log(`Successfully committed batch ${Math.floor(i / batchSize) + 1}`);
  }
  
  console.log('Full data import completed!');
  process.exit(0);
}

finalSeed().catch(err => {
  console.error('Final seeding failed:', err);
  process.exit(1);
});
