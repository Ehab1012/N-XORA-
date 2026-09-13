const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
global.XMLHttpRequest = require('xhr2');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const storage = getStorage(app);
const testRef = ref(storage, 'test.txt');
uploadString(testRef, 'hello world').then(async () => {
  const url = await getDownloadURL(testRef);
  console.log('Success!', url);
  process.exit(0);
}).catch(err => {
  console.error('Failed!', err);
  process.exit(1);
});
