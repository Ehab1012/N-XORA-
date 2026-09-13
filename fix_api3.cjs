const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

// Insert saveFileChunks at the top
const saveChunksFunction = `
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
if (!content.includes('saveFileChunks')) {
  // It shouldn't be there, but I'll add it after imports
  content = content.replace("import { db, firestore } from './db.js';", "import { db, firestore } from './db.js';\n" + saveChunksFunction);
} else {
  content = content.replace("import { db, firestore } from './db.js';", "import { db, firestore } from './db.js';\n" + saveChunksFunction);
}

// Fix the await inside db.mutate
// For /files/upload
content = content.replace(
`  const newFile = db.mutate((data) => {
    const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await saveFileChunks(generatedId, dataUrl);`,
`  const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  await saveFileChunks(generatedId, dataUrl);
  const newFile = db.mutate((data) => {`
);

// For /projects/:projectId/files
content = content.replace(
`  const newFile = db.mutate((data) => {
    const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await saveFileChunks(generatedId, dataUrl);`,
`  const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  await saveFileChunks(generatedId, dataUrl);
  const newFile = db.mutate((data) => {`
);

fs.writeFileSync('server/api.ts', content, 'utf-8');
