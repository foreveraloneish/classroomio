import { auth } from '$lib/auth';

export const validateUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    throw new Error('Unauthenticated user');
  }

  return session.user;
};
