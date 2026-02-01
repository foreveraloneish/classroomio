import type { Course } from '$lib/utils/types';
import type { Reaction, FeedApi, Feed } from '$lib/utils/types/feed';

export async function fetchNewsFeedReaction(feedId: Feed['id']) {
  // Not implemented in API yet, skipping or assuming handled by full feed fetch
  // Or fetch single feed
  return { data: null, error: null }; // Placeholder
}

export async function fetchNewsFeeds(courseId?: Course['id']) {
  const response = await fetch(`/api/courses/newsfeed?courseId=${courseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
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

export async function createNewFeed(post: {
  content: string;
  author_id: string;
  course_id: string;
  reaction: Reaction;
}) {
  const res = await fetch('/api/courses/newsfeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
  });
  const response = await res.json();
  return { response };
}

export async function handleEditFeed(feedId: string, content: string) {
  const res = await fetch('/api/courses/newsfeed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedId, content })
  });
  const response = await res.json();
  return response;
}

export async function createComment(comment: {
  content: string;
  author_id: string;
  course_newsfeed_id: string;
}) {
  const res = await fetch('/api/courses/newsfeed/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
  });
  const response = await res.json();
  return { response };
}

export async function toggleFeedIsPinned(feedId: string, isPinned: boolean) {
  const res = await fetch('/api/courses/newsfeed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedId, is_pinned: isPinned })
  });
  const response = await res.json();
  return { response };
}

export async function deleteNewsFeedComment(commentId: string) {
  const res = await fetch(`/api/courses/newsfeed/comment?id=${commentId}`, { method: 'DELETE' });
  const response = await res.json();
  return response;
}
export async function deleteNewsFeed(feedId: string) {
  const res = await fetch(`/api/courses/newsfeed?id=${feedId}`, { method: 'DELETE' });
  const response = await res.json();
  return response;
}

export async function getFeedForNotification(params: {
  feedId: string;
  authorId: string;
  supabase: typeof supabase;
}) {
  const { data, error } = await params.supabase
    .from('course_newsfeed')
    .select(
      `
    content,
    author:groupmember(profile(fullname, email)),
    course(
      id,
      title,
      group(
        organization(siteName, name),
        members:groupmember(id, profile(email, fullname))
      )
    )
  `
    )
    .eq('id', params.feedId)
    .limit(1)
    .returns<
      {
        content: string;
        author: {
          profile: {
            email: string;
            fullname: string;
          };
        };
        course: {
          id: string;
          title: string;
          group: {
            organization: {
              name: string;
              siteName: string;
            };
            members: {
              id: string;
              profile: {
                email: string;
                fullname: string;
              };
            }[];
          };
        };
      }[]
    >();

  if (error) {
    console.error('Failed to get feed', error);
    return null;
  }
  console.log({
    data
  });
  const [feed] = data || [];

  if (!feed) return;

  return {
    id: params.feedId,
    courseId: feed.course.id,
    courseTitle: feed.course.title,
    teacherName: feed.author?.profile?.fullname,
    teacherEmail: feed.author?.profile?.email,
    content: feed.content,
    org: feed.course.group?.organization,
    courseMembers: feed.course?.group?.members
      ?.filter((member) => member.id !== params.authorId)
      ?.map((member) => {
        return member.profile;
      })
  };
}
