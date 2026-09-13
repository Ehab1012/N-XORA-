const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString } = require('firebase/storage');
const { getAuth, signInAnonymously } = require('firebase/auth');
const fs = require('fs');
global.XMLHttpRequest = require('xhr2');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app);

signInAnonymously(auth).then(() => {
  const testRef = ref(storage, 'test2.txt');
  return uploadString(testRef, 'hello world');
}).then(() => {
  console.log('Success!');
  process.exit(0);
}).catch(err => {
  console.error('Failed!', err);
  process.exit(1);
});
