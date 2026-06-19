import { authClient } from '$lib/auth-client';

export const sanitizeDomain = (domain: string) => {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
    .split('/')[0];
};

export async function sendDomainRequest(key: string, domain: string): Promise<Response> {
  const session = await authClient.getSession();
  const accessToken = session?.data?.session?.token || '';

  return fetch('/api/domain', {
    method: 'POST',
    body: JSON.stringify({ params: { key, domain } }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : ''
    }
  });
}
