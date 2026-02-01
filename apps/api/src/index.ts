import 'dotenv/config';

import { app } from '$src/app';
import { configureOpenAPI } from '$src/utils/openapi';
import { env } from '$src/config/env';
import { serve } from '@hono/node-server';
import { showRoutes } from 'hono/dev';
import { initSocket } from '$src/services/socket';

// Start server
const port = env.PORT ? parseInt(env.PORT) : 3002;

function startServer() {
  console.log('Starting server on port:', port);

  const server = serve({ fetch: app.fetch, port });
  initSocket(server as any);

  showRoutes(app, { colorize: true });
}

configureOpenAPI(app);

startServer();
