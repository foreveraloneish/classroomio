import type { Profile } from '$lib/components/Course/components/People/types';

export async function getProfile(email: string): Promise<Profile | null> {
  const response = await fetch(`/api/profile/by-email?email=${encodeURIComponent(email)}`);
  const { data } = await response.json();
  return data ?? null;
}
