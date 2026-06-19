import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

// Mimic the nested selection
async function getCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
      status: 'ACTIVE'
    },
    include: {
        lesson_sections: {
            select: { id: true, title: true, order: true, created_at: true }
        },
        lessons: {
            include: {
                _count: {
                    select: {
                        exercises: true,
                        comments: true
                    }
                },
                teacher: {
                    select: { id: true, avatar_url: true, fullname: true } // Assuming User has these
                },
                completions: true
            }
        },
        attendance: true,
        polls: { select: { status: true } }
    }
  });

  if (!course) {
    throw new Error('Course not found');
  }

  // Transform to match legacy structure if needed, or update frontend to use new structure.
  // The frontend expects:
  // lessons: [ { ..., totalExercises: count, totalComments: count, lesson_completion: [...] } ]
  // Prisma returns:
  // lessons: [ { ..., _count: { exercises: count, comments: count }, completions: [...] } ]

  const transformedCourse = {
      ...course,
      lessons: course.lessons.map(l => ({
          ...l,
          totalExercises: [{ count: l._count.exercises }],
          totalComments: [{ count: l._count.comments }],
          lesson_completion: l.completions,
          profile: l.teacher
      }))
  };

  return transformedCourse;
}

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { courseId } = await request.json();
  if (!courseId) {
    return json({ success: false, message: 'Course ID is required' }, { status: 400 });
  }

  try {
    const course = await getCourse(courseId);

    // Check permissions
    // Find group member
    const membership = await prisma.groupMember.findFirst({
        where: {
            group_id: course.group_id as string, // group_id should exist on course
            profile_id: userId
        },
        include: {
            user: true
        }
    });

    if (!membership) {
        return json({
            success: false,
            message: 'Access denied. User is not a member of this course.',
            data: null
        }, { status: 403 });
    }

    const isStudent = Number(membership.role_id) === 3; // Assuming 3 is Student

    let groupData;
    if (isStudent) {
        groupData = {
            id: course.group_id,
            members: [membership]
        };
    } else {
        const group = await prisma.group.findUnique({
            where: { id: course.group_id as string },
            include: {
                members: {
                    include: { user: true }
                }
            }
        });
        groupData = {
            id: group?.id,
            members: group?.members.map(m => ({
                ...m,
                profile: m.user
            }))
        };
    }

    return json({
      success: true,
      data: toJSON({ ...course, group: groupData })
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Course not found' ? 404 : 500;

    return json(
      {
        success: false,
        message,
        data: null
      },
      { status }
    );
  }
};
