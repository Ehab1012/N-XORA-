const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

// Function to chunk and save
const saveChunksFunction = `
async function saveFileChunks(fileId, dataUrl) {
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

content = content.replace("import { db } from './db.js';", "import { db, firestore } from './db.js';\nimport { doc, getDoc, getDocs, writeBatch, collection, query, where, orderBy } from 'firebase/firestore';\n" + saveChunksFunction);

content = content.replace("apiRouter.post('/files/upload', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {", "apiRouter.post('/files/upload', requireAuth, rateLimit(25, 60000), async (req: AuthenticatedRequest, res: Response) => {");

content = content.replace("apiRouter.post('/projects/:projectId/files', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {", "apiRouter.post('/projects/:projectId/files', requireAuth, rateLimit(25, 60000), async (req: AuthenticatedRequest, res: Response) => {");

// Replace dataUrl in files/upload
content = content.replace(/const file = \{\n      id: 'file_' \+ Date\.now\(\)\.toString\(36\) \+ '_' \+ Math\.random\(\)\.toString\(36\)\.substring\(2, 6\),\n      name: name\.trim\(\),\n      mimeType: mimeType \|\| 'application\/octet-stream',\n      sizeBytes: Math\.round\(\(dataUrl\.length \* 3\) \/ 4\),\n      uploadedById: req\.user!\.id,\n      uploadedByName: req\.user!\.name,\n      projectId: projectId \|\| undefined,\n      dataUrl,\n/g, 
`const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await saveFileChunks(generatedId, dataUrl);
    const file = {
      id: generatedId,
      name: name.trim(),
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      uploadedById: req.user!.id,
      uploadedByName: req.user!.name,
      projectId: projectId || undefined,
      dataUrl: '/api/files/' + generatedId + '/content',
`);

// Replace dataUrl in projects/:projectId/files
content = content.replace(/const file = \{\n      id: 'file_' \+ Date\.now\(\)\.toString\(36\) \+ '_' \+ Math\.random\(\)\.toString\(36\)\.substring\(2, 6\),\n      name: name\.trim\(\),\n      mimeType: mimeType \|\| 'application\/octet-stream',\n      sizeBytes: Math\.round\(\(dataUrl\.length \* 3\) \/ 4\),\n      uploadedById: req\.user!\.id,\n      uploadedByName: req\.user!\.name,\n      projectId,\n      dataUrl,\n/g, 
`const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await saveFileChunks(generatedId, dataUrl);
    const file = {
      id: generatedId,
      name: name.trim(),
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      uploadedById: req.user!.id,
      uploadedByName: req.user!.name,
      projectId,
      dataUrl: '/api/files/' + generatedId + '/content',
`);


// Add the /api/files/:id/content GET endpoint
const downloadEndpoint = `
apiRouter.get('/files/:id/content', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const fileMeta = db.getRawData().files.find(f => f.id === id) || db.getRawData().resources.find(r => r.fileId === id);
    if (!fileMeta) {
       // Just try fetching chunks anyway
    }
    
    let fullDataUrl = '';
    let index = 0;
    while (true) {
      const chunkDoc = await getDoc(doc(firestore, 'nexora_file_chunks', id + '_' + index));
      if (!chunkDoc.exists()) break;
      fullDataUrl += chunkDoc.data().data;
      index++;
    }
    
    if (!fullDataUrl) {
      res.status(404).send('File not found');
      return;
    }
    
    if (fullDataUrl.startsWith('data:')) {
      const match = fullDataUrl.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        res.setHeader('Content-Type', mime);
        res.send(buffer);
        return;
      }
    }
    
    res.send(fullDataUrl);
  } catch (err) {
    console.error('Failed to stream file:', err);
    res.status(500).send('Internal Server Error');
  }
});
`;

content = content.replace("apiRouter.post('/files/upload',", downloadEndpoint + "\napiRouter.post('/files/upload',");

fs.writeFileSync('server/api.ts', content, 'utf-8');
