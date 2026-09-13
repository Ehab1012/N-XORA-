const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf-8');

content = content.replace(
`  const newFile = db.mutate((d) => {
    const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await saveFileChunks(generatedId, dataUrl);`,
`  const generatedId = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  await saveFileChunks(generatedId, dataUrl);
  const newFile = db.mutate((d) => {`
);

fs.writeFileSync('server/api.ts', content, 'utf-8');
