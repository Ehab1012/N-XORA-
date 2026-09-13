const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf-8');
content = content.replace("const firestore = getFirestore(firebaseConfig.firestoreDatabaseId);", "export const firestore = getFirestore(firebaseConfig.firestoreDatabaseId);");
fs.writeFileSync('server/db.ts', content, 'utf-8');
