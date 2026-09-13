const { initializeApp, getApps, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: config.projectId
  });
}

const db = getFirestore(config.firestoreDatabaseId);
db.collection('test').limit(1).get().then(() => {
  console.log('Firestore connected successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Firestore connection failed:', err);
  process.exit(1);
});
