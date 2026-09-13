const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf-8');

const importReplacement = `import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = getFirestore();`;

content = content.replace("import fs from 'fs';\nimport path from 'path';", importReplacement);

const loadDataMatch = content.match(/constructor\(\) \{\n    this.data = this.loadData\(\);\n  \}/);
const constructorReplacement = `constructor() {
    this.data = this.loadData();
  }

  public async init() {
    try {
      console.log('Restoring DB state from Firestore...');
      const dbRef = firestore.collection('nexora_data');
      const collections = await dbRef.get();
      
      if (!collections.empty) {
        const restoredData = { ...this.data };
        collections.forEach(doc => {
          if (doc.data().value) {
            restoredData[doc.id] = doc.data().value;
          }
        });
        this.data = restoredData;
        this.saveDataLocally(this.data);
        console.log('Successfully restored DB state from Firestore.');
      } else {
        console.log('No Firestore state found. Initializing with local data.');
        await this.syncToFirestore(this.data);
      }
    } catch (err) {
      console.error('Failed to restore from Firestore:', err);
    }
  }

  private saveDataLocally(data: any) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save local database file:', err);
    }
  }`;

content = content.replace(loadDataMatch[0], constructorReplacement);

const saveDataMatch = content.match(/private saveData\(data: DatabaseSchema\) \{\n    try \{\n      if \(\!fs\.existsSync\(DATA_DIR\)\) \{\n        fs\.mkdirSync\(DATA_DIR, \{ recursive: true \}\);\n      \}\n      fs\.writeFileSync\(DB_FILE, JSON\.stringify\(data, null, 2\), 'utf-8'\);\n    \} catch \(err\) \{\n      console\.error\('Failed to save database file:', err\);\n    \}\n  \}/);

const newSaveData = `private saveData(data: DatabaseSchema) {
    this.saveDataLocally(data);
    this.syncToFirestore(data).catch((err) => console.error("Firestore sync error:", err));
  }

  private async syncToFirestore(data: DatabaseSchema) {
    try {
      const batch = firestore.batch();
      const dbRef = firestore.collection('nexora_data');
      
      for (const [key, value] of Object.entries(data)) {
         batch.set(dbRef.doc(key), { value });
      }
      
      await batch.commit();
    } catch (err) {
      console.error('Firestore batch write error:', err);
    }
  }`;

content = content.replace(saveDataMatch[0], newSaveData);

fs.writeFileSync('server/db.ts', content, 'utf-8');
console.log('db.ts patched');
