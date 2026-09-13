import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api.js';
import { authMiddleware } from './server/auth.js';
import { db } from './server/db.js';

async function startServer() {
  await db.init();
  const app = express();
  const PORT = 3000;

  // Basic security & parsing middleware (Supports up to 1GB file uploads)
  app.use(express.json({ limit: '1024mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1024mb' }));
  app.use(cookieParser());

  // Attach session context
  app.use(authMiddleware);

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Setup Vite dev server or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexora server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error launching Nexora server:', err);
  process.exit(1);
});
