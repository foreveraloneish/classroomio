import type { UserLessonDataType } from '$lib/utils/types';

function getFirstAndLastDayOfMonth(): { firstDay: string; lastDay: string } {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  // Create a date object for the first day of the month
  const firstDay = new Date(year, month, 1).toISOString();

  // Find the last day of the next month and subtract one day to get the last day of the current month
  const nextMonth: any = new Date(year, month + 1, 1);
  const lastDay = new Date(nextMonth - 1).toISOString();

  return {
    firstDay,
    lastDay
  };
}

export async function fetchUserUpcomingData(
  profileId: string | null,
  orgId: string
): Promise<UserLessonDataType[] | []> {
  if (!profileId) {
    return [];
  }

  const { lastDay, firstDay } = getFirstAndLastDayOfMonth();

  try {
    const res = await fetch('/api/analytics/upcoming-lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, orgId, startAt: firstDay, endAt: lastDay })
    });

    if (!res.ok) return [];

    const result = await res.json();

    return result.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}
