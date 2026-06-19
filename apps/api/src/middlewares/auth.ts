import { Context, Next } from 'hono';

import { validateUser } from '$src/utils/auth/validate-user';

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const user = await validateUser(c.req.raw.headers);
    c.set('user', user); // Attach the user to the context
    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized'
      },
      401
    );
  }
};
