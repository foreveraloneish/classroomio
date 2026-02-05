import { getAccessToken } from '$lib/utils/functions/auth-client';
import type { ExerciseSubmissions } from '$lib/utils/types';

export async function fetchSubmissionStatus() {
  const accessToken = await getAccessToken();
  const res = await fetch('/api/courses/submissionstatus', { headers: { Authorization: accessToken || '' } });
  if (!res.ok) throw new Error('Failed to fetch submission statuses');
  const result = await res.json();
  return result.data;
}

export async function fetchSubmissions(course_id: string) {
  const accessToken = await getAccessToken();

  const response = await fetch(`/api/courses/submissions?courseId=${course_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      data: null,
      error: { message: error }
    };
  }

  const { success, data, message } = await response.json();

  if (!success) {
    return {
      data: null,
      error: { message }
    };
  }

  return { data, error: null };
}

export async function fetchSubmission({
  courseId,
  exerciseId,
  submittedBy
}: {
  exerciseId: string;
  courseId?: string;
  submittedBy?: string;
}) {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({ exerciseId });
  if (courseId) params.append('courseId', courseId);
  if (submittedBy) params.append('submittedBy', submittedBy);

  const response = await fetch(`/api/courses/submission?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      data: null,
      error: { message: error }
    };
  }

  const { success, data, message } = await response.json();

  if (!success) {
    return {
      data: null,
      error: { message }
    };
  }

  return { data, error: null };
}

export async function updateSubmission(
  {
    id,
    status_id,
    total,
    feedback
  }: { id: string; status_id?: number; total?: number; feedback?: string },
  otherArgs?: Record<string, string>
) {
  const toUpdate: {
    status_id?: number;
    total?: number;
    feedback?: string;
  } = {
    status_id,
    feedback
  };

  if (typeof total === 'number') {
    toUpdate.total = total;
  }

  const accessToken = await getAccessToken();
  const res = await fetch('/api/courses/submission', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: accessToken || '' },
    body: JSON.stringify({ id, status_id, total, feedback })
  });

  return await res.json();
}

export async function deleteSubmission(id: string) {
  const accessToken = await getAccessToken();
  const res = await fetch(`/api/courses/submission?id=${id}`, { method: 'DELETE', headers: { Authorization: accessToken || '' } });
  return await res.json();
}

export async function updateQuestionAnswer(
  update: Record<string, string>,
  match: Record<string, string>
) {
  const accessToken = await getAccessToken();
  const res = await fetch('/api/courses/question-answer', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: accessToken || '' },
    body: JSON.stringify({ update, match })
  });
  return await res.json();
}
