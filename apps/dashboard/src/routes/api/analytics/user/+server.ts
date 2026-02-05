import type {
  UserAnalytics,
  UserCourseAnalytics,
  UserExerciseStatsQuery,
  UserExercisesStats
} from '$lib/utils/types/analytics';
import { fetchCourses, fetchProfileCourseProgress } from '$lib/utils/services/courses';

import { calcPercentageWithRounding } from '$lib/utils/functions/number';
import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

const CACHE_DURATION = 60 * 5; // 5 minutes

export async function POST({ setHeaders, request }) {
  const { userId, courseId, orgId } = await request.json();

  if (!userId) {
    return json({ success: false, message: 'Request is missing required fields' }, { status: 400 });
  }

  setHeaders({
    'cache-control': `max-age=${CACHE_DURATION}`,
    'content-type': 'application/json'
  });

  if (courseId) {
    const userCourseAnalytics = await getStudentAnalyticsData(userId, courseId);
    return json(userCourseAnalytics);
  }

  if (orgId) {
    const userAnalytics = await getAudienceData(userId, orgId);
    return json(userAnalytics);
  }

  return json({ error: 'Invalid request' }, { status: 400 });
}

function sumArrObject<T>(arr: T[], key: keyof T) {
  return arr.reduce((sum, item) => sum + ((item[key] as number) || 0), 0);
}

async function getLastLogin(userId: string): Promise<string | undefined> {
  try {
    // Fallback for last-seen: use latest session expiresAt or user's updatedAt
    const lastSession = await prisma.session.findFirst({
      where: { userId },
      orderBy: { expiresAt: 'desc' }
    });

    if (lastSession?.expiresAt) return lastSession.expiresAt.toISOString();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { updatedAt: true } });
    return user?.updatedAt?.toISOString();
  } catch (error) {
    console.error(error);
  }
}

async function getAudienceData(userId: string, orgId: string): Promise<UserAnalytics> {
  const audienceAnalytics: UserAnalytics = {
    user: {
      id: userId,
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: 'https://example.com/avatar.png',
      lastSeen: new Date().toISOString()
    },
    courses: [],
    overallCourseProgress: 0,
    overallAverageGrade: 0
  };

  const userResult = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullname: true, email: true, avatar_url: true, updatedAt: true }
  });

  if (!userResult) throw new Error('Failed to fetch user profile');

  audienceAnalytics.user.fullName = userResult.fullname || '';
  audienceAnalytics.user.email = userResult.email || '';
  audienceAnalytics.user.avatarUrl = userResult.avatar_url || '';
  audienceAnalytics.user.lastSeen = await getLastLogin(userId);

  // Fetch courses for org
  const allCourses = await prisma.course.findMany({
    where: { group: { organization_id: orgId }, status: 'ACTIVE' }
  });

  for (const course of allCourses) {
    const [userExercisesStats, userCourseProgress] = await Promise.all([
      fetchUserExercisesStats(course.id, userId),
      fetchProfileCourseProgress(course.id, userId)
    ]);

    const courseProgress = userCourseProgress?.data?.[0];

    const exercisesStats = userExercisesStats || [];
    const totalEarnedPoints = sumArrObject(exercisesStats, 'score');
    const totalPoints = sumArrObject(exercisesStats, 'totalPoints');

    const averageGrade = calcPercentageWithRounding(totalEarnedPoints, totalPoints);
    const lessonsCompleted = courseProgress?.lessons_completed || 0;
    const lessonsCount = courseProgress?.lessons_count || 0;

    audienceAnalytics.courses.push({
      ...course,
      ...courseProgress,
      progress_percentage: calcPercentageWithRounding(lessonsCompleted, lessonsCount),
      average_grade: averageGrade
    });
  }

  const totalLessons = audienceAnalytics.courses.reduce(
    (acc, course) => acc + course.lessons_count,
    0
  );
  const completedLessons = audienceAnalytics.courses.reduce(
    (acc, course) => acc + course.lessons_completed,
    0
  );
  const overallCourseProgress = calcPercentageWithRounding(completedLessons, totalLessons);

  const allGrades = sumArrObject(audienceAnalytics.courses, 'average_grade');
  const overallAverageGrade = calcPercentageWithRounding(
    allGrades,
    audienceAnalytics.courses.length
  );

  audienceAnalytics.overallCourseProgress = overallCourseProgress;
  audienceAnalytics.overallAverageGrade = overallAverageGrade || 0;

  return audienceAnalytics;
}

async function getStudentAnalyticsData(
  userId: string,
  courseId: string
): Promise<UserCourseAnalytics> {
  const userCourseAnalytics: UserCourseAnalytics = {
    user: {
      id: userId,
      fullName: '',
      avatarUrl: '',
      lastSeen: '',
      email: ''
    },
    averageGrade: 0,
    userExercisesStats: [],
    totalExercises: 0,
    completedExercises: 0,
    progressPercentage: 0
  };

  // fetch user details
  const userResult = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullname: true, email: true, avatar_url: true }
  });

  if (!userResult) throw new Error('Failed to fetch user profile');

  userCourseAnalytics.user.fullName = userResult.fullname || '';
  userCourseAnalytics.user.email = userResult.email || '';
  userCourseAnalytics.user.avatarUrl = userResult.avatar_url || '';
  userCourseAnalytics.user.lastSeen = await getLastLogin(userId);

  // fetch marks, lessons, and exercise progress (Prisma)
  const [userExercisesStats, lessons, profileCourseProgress] = await Promise.all([
    fetchUserExercisesStats(courseId, userId),
    fetchLessonsWithCompletion(courseId, userId),
    // get exercises_count/completed from submissions/lesson_completions
    prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM exercise WHERE lesson.course_id = $1) AS exercises_count,
        (SELECT COUNT(*) FROM exercise e
           JOIN submission s ON e.id = s.exercise_id
           JOIN groupmember gm ON s.submitted_by = gm.id
         WHERE e.course_id = $1 AND gm.profile_id = $2
        ) AS exercises_completed
      `, courseId, userId)
  ]);

  if (!userExercisesStats || !lessons || !profileCourseProgress) {
    throw new Error('Failed to fetch course analytics data');
  }

  const totalEarnedPoints = sumArrObject(userExercisesStats, 'score');
  const totalPoints = sumArrObject(userExercisesStats, 'totalPoints');

  userCourseAnalytics.averageGrade = calcPercentageWithRounding(totalEarnedPoints, totalPoints);
  userCourseAnalytics.userExercisesStats = userExercisesStats;

  const completedLessons = lessons.filter((lesson) => lesson.completed);

  // profileCourseProgress comes from raw query; structure may be engine dependent
  const exercisesCount = (profileCourseProgress && profileCourseProgress[0] && profileCourseProgress[0].exercises_count) || 0;
  const exercisesCompleted = (profileCourseProgress && profileCourseProgress[0] && profileCourseProgress[0].exercises_completed) || 0;

  userCourseAnalytics.totalExercises = Number(exercisesCount);
  userCourseAnalytics.completedExercises = Number(exercisesCompleted);

  console.log('completedLessons.length', completedLessons.length);
  console.log('lessons.length', lessons.length);
  userCourseAnalytics.progressPercentage = calcPercentageWithRounding(
    completedLessons.length,
    lessons.length
  );

  return userCourseAnalytics;
}

async function fetchUserExercisesStats(
  courseId: string,
  userId: string
): Promise<UserExercisesStats[] | undefined> {
  try {
    // Find group member ids for this user
    const groupMembers = await prisma.groupMember.findMany({ where: { profile_id: userId } });
    const groupMemberIds = groupMembers.map((g) => g.id);

    // Find exercises for the course and include related questions and submissions
    const lessons = await prisma.lesson.findMany({
      where: { course_id: courseId },
      select: {
        id: true,
        title: true,
        exercise: {
          select: {
            id: true,
            title: true,
            lesson_id: true,
            questions: { select: { points: true } },
            submissions: { where: { submitted_by: { in: groupMemberIds } }, take: 1 }
          }
        }
      }
    });

    const userExercisesStats: UserExercisesStats[] = lessons.flatMap((lesson) =>
      lesson.exercise.map((exercise) => {
        const totalPoints = (exercise.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);
        const userSubmission = (exercise.submissions || [])[0];

        return {
          id: exercise.id,
          lessonId: exercise.lesson_id,
          lessonTitle: lesson.title,
          title: exercise.title,
          status: userSubmission?.status_id as any,
          score: Number(userSubmission?.total || 0),
          totalPoints,
          isCompleted: !!userSubmission
        };
      })
    );

    return userExercisesStats;
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function fetchLessonsWithCompletion(courseId, userId) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { course_id: courseId },
      include: { completions: { where: { profile_id: userId } }, _count: { select: { exercises: true } } }
    });

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      created_at: lesson.created_at,
      completed: (lesson.completions || []).length > 0,
      exerciseNo: lesson._count?.exercises || 0
    }));
  } catch (error) {
    console.error('Error fetching lessons or completions:', error);
    return [];
  }
}
