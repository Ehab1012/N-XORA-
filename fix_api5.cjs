const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

const importReplacement = `import { db, DatabaseSchema, firestore } from './db.js';
import { collection, doc, setDoc, getDoc, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';

async function saveFileChunks(fileId: string, dataUrl: string) {
  const chunkSize = 500000;
  const numChunks = Math.ceil(dataUrl.length / chunkSize);
  const batch = writeBatch(firestore);
  for (let i = 0; i < numChunks; i++) {
    const chunk = dataUrl.substring(i * chunkSize, (i + 1) * chunkSize);
    batch.set(doc(firestore, 'nexora_file_chunks', fileId + '_' + i), { data: chunk, index: i });
  }
  await batch.commit();
}
`;

content = content.replace("import { db, DatabaseSchema } from './db.js';", importReplacement);
fs.writeFileSync('server/api.ts', content, 'utf-8');
