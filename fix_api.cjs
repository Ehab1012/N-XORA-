const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

const importReplacement = `import { db, firestore } from './db.js';
import { collection, doc, setDoc, getDoc, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';`;
content = content.replace("import { db } from './db.js';", importReplacement);

// We need to replace the dataUrl logic in the two file upload endpoints.
// We'll change the endpoint to an async function.
content = content.replace("apiRouter.post('/files/upload', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {", "apiRouter.post('/files/upload', requireAuth, rateLimit(25, 60000), async (req: AuthenticatedRequest, res: Response) => {");
content = content.replace("apiRouter.post('/projects/:projectId/files', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {", "apiRouter.post('/projects/:projectId/files', requireAuth, rateLimit(25, 60000), async (req: AuthenticatedRequest, res: Response) => {");

// Wait, doing this via string replacement might be fragile.
