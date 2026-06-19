import { prisma } from '@cio/database';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function load({ params }) {
    const orgSlug = params.slug;

    const [publishedCourse, firstCourse, firstLesson, firstExercise] = await Promise.all([
        prisma.course.findFirst({
            where: {
                is_published: true,
                group: { organization: { siteName: orgSlug } }
            },
            select: { is_published: true }
        }),
        prisma.course.findFirst({
             where: { group: { organization: { siteName: orgSlug } } },
             include: { group: { include: { organization: { select: { avatar_url: true, siteName: true } } } } }
        }),
        prisma.lesson.findFirst({
             where: { course: { group: { organization: { siteName: orgSlug } } } }
        }),
        prisma.exercise.findFirst({
             where: { lesson: { course: { group: { organization: { siteName: orgSlug } } } } }
        })
    ]);

    const isCoursePublished = !!publishedCourse;
    const isCourseCreated = !!firstCourse;
    const orgHasAvatarUrl = !!firstCourse?.group?.organization?.avatar_url;

    const isLessonCreated = !!firstLesson;
    const isExerciseCreated = !!firstExercise;

    const data = [
        {
          id: 'profile',
          title: 'setup.personal_profile.title',
          desc: 'setup.personal_profile.desc',
          is_completed: false,
          button_label: 'setup.personal_profile.button_label'
        },
        {
          id: 'organization',
          title: 'setup.organization_profile.title',
          desc: 'setup.organization_profile.desc',
          is_completed: orgHasAvatarUrl,
          button_label: 'setup.organization_profile.button_label'
        },
        {
          id: 'course',
          title: 'setup.course.title',
          desc: 'setup.course.desc',
          is_completed: isCourseCreated,
          button_label: 'setup.course.button_label'
        },
        {
          id: 'lesson',
          title: 'setup.lesson.title',
          desc: 'setup.lesson.desc',
          is_completed: isLessonCreated,
          button_label: 'setup.lesson.button_label'
        },
        {
          id: 'exercise',
          title: 'setup.exercise.title',
          desc: 'setup.exercise.desc',
          is_completed: isExerciseCreated,
          button_label: 'setup.exercise.button_label'
        },
        {
          id: 'publish',
          title: 'setup.publish_course.title',
          desc: 'setup.publish_course.desc',
          is_completed: isCoursePublished,
          button_label: 'setup.publish_course.button_label'
        }
      ];

      return {
        orgSiteName: orgSlug,
        setup: data,
        courses: firstCourse ? [toJSON(firstCourse)] : [],
        lessons: firstLesson ? [toJSON(firstLesson)] : []
      };
}
