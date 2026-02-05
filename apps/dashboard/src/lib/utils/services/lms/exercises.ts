export interface LMSExercise {
  id: string;
  title: string;
  updated_at: string;
  questions: {
    points: number;
  }[];
  submission: any[];
  lesson: any;
}

interface FetchLMSExercisesResponse {
  exercises: LMSExercise[] | null;
  error: any | null;
}

export async function fetchLMSExercises(
  profileId: string,
  orgId: string
): Promise<FetchLMSExercisesResponse> {
  try {
    const res = await fetch('/api/lms/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, orgId })
    });

    if (!res.ok) {
      return { exercises: null, error: new Error('Failed to fetch') };
    }

    const result = await res.json();
    return { exercises: result.data || null, error: null };
  } catch (err) {
    return { exercises: null, error: err };
  }
}
