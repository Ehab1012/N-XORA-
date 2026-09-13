const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

content = content.replace(
`apiRouter.post('/resources', requireAuth, (req: AuthenticatedRequest, res: Response) => {`,
`apiRouter.post('/resources', requireAuth, async (req: AuthenticatedRequest, res: Response) => {`
);

content = content.replace(
`  const newResource = db.mutate((data) => {
    const resItem = {
      id: 'res_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),`,
`  const generatedId = 'res_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  if (dataUrl) {
    await saveFileChunks(generatedId, dataUrl);
  }
  const newResource = db.mutate((data) => {
    const resItem = {
      id: generatedId,`
);

content = content.replace(
`      fileType: fileType ? String(fileType) : undefined,
      dataUrl: dataUrl ? String(dataUrl) : undefined,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : undefined,`,
`      fileType: fileType ? String(fileType) : undefined,
      dataUrl: dataUrl ? '/api/files/' + generatedId + '/content' : undefined,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : undefined,`
);

fs.writeFileSync('server/api.ts', content, 'utf-8');
