import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import publicAndAuthRoutes from './server/routes/publicAndAuth.ts';
import crmAndCatalogRoutes from './server/routes/crmAndCatalog.ts';
import operationsRoutes from './server/routes/operations.ts';
import serviceFilesReportsRoutes from './server/routes/serviceFilesReports.ts';
import { errorHandler } from './server/middleware/auth.ts';
import { initializeStore, flushStore } from './server/db/store.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  // Initialize PostgreSQL (production) or local development storage before accepting requests.
  await initializeStore();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProd && allowedOrigins.length === 0) {
    throw new Error('Set CORS_ORIGIN to your deployed website origin in production.');
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin is not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true, limit: '6mb' }));

  // REST API Mounts
  app.use('/api', publicAndAuthRoutes);
  app.use('/api', crmAndCatalogRoutes);
  app.use('/api', operationsRoutes);
  app.use('/api', serviceFilesReportsRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use(errorHandler);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`AviAqua server listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });
  const shutdown = async () => {
    console.log('[Server] Shutting down; flushing pending database writes...');
    server.close(async () => {
      try { await flushStore(); } finally { process.exit(0); }
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start AviAqua server:', err);
  process.exit(1);
});
