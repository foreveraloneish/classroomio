import { getAccessToken } from '$lib/utils/functions/auth-client';

export async function takeAttendance(update) {
  const token = await getAccessToken();
  const res = await fetch('/api/courses/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token || '' },
    body: JSON.stringify(update)
  });

  return res.json();
}
