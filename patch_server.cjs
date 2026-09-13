const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const importReplacement = `import { authMiddleware } from './server/auth.js';\nimport { db } from './server/db.js';`;
content = content.replace("import { authMiddleware } from './server/auth.js';", importReplacement);

const startReplacement = `async function startServer() {
  await db.init();
  const app = express();`;
content = content.replace("async function startServer() {\n  const app = express();", startReplacement);

fs.writeFileSync('server.ts', content, 'utf-8');
console.log('server.ts patched');
