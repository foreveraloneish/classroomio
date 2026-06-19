import 'dotenv/config';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cloneRouter } from '$src/routes/course/clone';
import { pollRouter } from '$src/routes/poll';
import { presignRouter } from '$src/routes/course/presign';
import { logger } from 'hono/logger';
import { mailRouter } from '$src/routes/mail';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

// Create Hono app with chaining for RPC support
export const app = new Hono()
  // Middleware
  .use('*', logger())
  .use('*', prettyJSON())
  .use('*', secureHeaders())
  .use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true
    })
  )

  // Routes
  .get('/', (c) =>
    c.json({
      message: '"Welcome to Classroomio.com API - docs are at https://api.classroomio.com/docs"'
    })
  )
  .route('/course/clone', cloneRouter)
  .route('/course/presign', presignRouter)
  .route('/mail', mailRouter)
  .route('/poll', pollRouter)

  // Error handling
  .onError((err, c) => {
    console.error('Error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });
