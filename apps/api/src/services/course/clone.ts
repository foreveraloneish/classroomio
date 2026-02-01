import { prisma } from '@cio/database';
import type { Course, Lesson, LessonSection } from '@prisma/client';

// Constants
const QUESTION_TYPE_TEXTAREA = 2; // Paragraph question type
const ROLE_TUTOR = 2; // Tutor role ID

const lessonInclude = {
    exercises: {
        include: {
            questions: {
                include: {
                    options: true,
                    questionType: true
                }
            }
        }
    },
    lesson_languages: true
};

// fetches course data with backward compatibility for courses that is either V1 or V2
async function fetchCourseData(courseId: string) {
  const data = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lesson_sections: {
        include: {
          lessons: {
            include: lessonInclude
          }
        }
      },
      lessons: {
        include: lessonInclude
      }
    }
  });

  return { data, error: null };
}

async function addGroupMember(params: {
  profile_id: string;
  email: string;
  group_id: string;
  role_id: number;
}) {
  const data = await prisma.groupMember.create({
    data: {
        profile_id: params.profile_id,
        email: params.email,
        group_id: params.group_id,
        role_id: BigInt(params.role_id)
    }
  });
  return { data: [data], error: null };
}

async function cloneGroupAndBasicCourse(
  course: Course,
  newTitle: string,
  userId: string,
  newDescription?: string,
  newSlug?: string,
  organizationId?: string
) {
  const { description } = course;
  const finalDescription = newDescription || description;
  const finalSlug = newSlug || undefined;

  // 1. Create group
  const newGroup = await prisma.group.create({
    data: {
      name: newTitle,
      description: finalDescription,
      organization_id: organizationId
    }
  });

  const group_id = newGroup.id;

  // Remove nested relations and metadata that shouldn't be inserted
  // Prisma course type is just fields
  const { id, updated_at, created_at, group_id: oldGroupId, ...courseData } = course as any;

  // 2. Create course with group_id
  const newCourse = await prisma.course.create({
    data: {
      ...courseData,
      title: newTitle,
      description: finalDescription,
      slug: finalSlug,
      group_id
    }
  });

  // 3. Add group member (the user who is cloning)
  await addGroupMember({
    profile_id: userId,
    email: '', // Email will be fetched from profile
    group_id,
    role_id: ROLE_TUTOR
  });

  return {
    newCourse
  };
}

async function cloneLessonSections(
  sections: (LessonSection & { lessons: any[] })[],
  courseId: string
) {
  if (!sections || sections.length === 0) {
    return { newSections: [], sectionIdMap: undefined };
  }

  const sortedSections = sections
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

  const newSections = [];
  const sectionIdMap = new Map<string, string>();

  for (const section of sortedSections) {
      const newSection = await prisma.lessonSection.create({
          data: {
              title: section.title,
              order: section.order,
              course_id: courseId
          }
      });
      newSections.push(newSection);
      sectionIdMap.set(section.id, newSection.id);
  }

  return { newSections, sectionIdMap };
}

async function cloneLessons(
  lessons: (Lesson & { exercises: any[], lesson_languages: any[] })[],
  courseId: string,
  sectionIdMap?: Map<string, string>
) {
  const sortedLessons = lessons
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

  const newLessons = [];

  for (let index = 0; index < sortedLessons.length; index++) {
      const lesson = sortedLessons[index];
      const newLesson = await prisma.lesson.create({
          data: {
            call_url: lesson.call_url,
            course_id: courseId,
            section_id: lesson.section_id && sectionIdMap ? sectionIdMap.get(lesson.section_id) : null,
            is_unlocked: lesson.is_unlocked,
            lesson_at: new Date(),
            note: lesson.note,
            order: lesson.order || BigInt(index + 1),
            public: lesson.public,
            slide_url: lesson.slide_url,
            title: lesson.title,
            videos: lesson.videos ?? undefined
          }
      });
      newLessons.push({
          ...newLesson,
          exercises: lesson.exercises,
          lesson_languages: lesson.lesson_languages
      });
  }

  return { newLessons };
}

async function cloneLessonLanguages(lessons: any[]) {
  for (const lesson of lessons) {
    const { id: lessonId, lesson_languages = [] } = lesson;

    if (!lesson_languages || lesson_languages.length === 0) continue;

    for (const lang of lesson_languages) {
        await prisma.lessonLanguage.create({
            data: {
                lesson_id: lessonId,
                content: lang.content,
                locale: lang.locale
            }
        });
    }
  }
  return true;
}

async function cloneExercises(lessons: any[]) {
  for (const lesson of lessons) {
    const { id: lessonId, exercises = [] } = lesson;

    for (const exerciseItem of exercises) {
      const { title, description, questions = [] } = exerciseItem;

      const newExercise = await prisma.exercise.create({
          data: {
              description,
              due_by: new Date(),
              lesson_id: lessonId,
              title
          }
      });

      for (const question of questions) {
        const { options = [] } = question;

        const newQuestion = await prisma.question.create({
            data: {
                name: question.name,
                title: question.title,
                points: question.points,
                order: question.order,
                question_type_id: question.question_type_id,
                exercise_id: newExercise.id
            }
        });

        if (Number(newQuestion.question_type_id) !== QUESTION_TYPE_TEXTAREA && options.length > 0) {
            for (const option of options) {
                await prisma.option.create({
                    data: {
                        value: option.value,
                        label: option.label,
                        is_correct: option.is_correct,
                        question_id: newQuestion.id
                    }
                });
            }
        }
      }
    }
  }
  return true;
}

export async function cloneCourse(
  courseId: string,
  newTitle: string,
  userId: string,
  newDescription?: string,
  newSlug?: string,
  organizationId?: string
) {
  const { data: course, error } = await fetchCourseData(courseId);

  if (error || !course) {
    throw new Error('Course not found');
  }

  // 1. Clone course and group
  // @ts-ignore
  const { newCourse } = await cloneGroupAndBasicCourse(
    course,
    newTitle,
    userId,
    newDescription,
    newSlug,
    organizationId
  );

  let sectionIdMap: Map<string, string> | undefined = undefined;
  let allLessons: any[] = [];

  // 2. Clone sections if this is a V2 course with sections
  if (course.lesson_sections && course.lesson_sections.length > 0) {
    const { sectionIdMap: map } = await cloneLessonSections(course.lesson_sections, newCourse.id);
    sectionIdMap = map;

    // Collect all lessons from sections
    course.lesson_sections.forEach((section: any) => {
      if (section.lessons && section.lessons.length > 0) {
        allLessons = [...allLessons, ...section.lessons];
      }
    });
  }

  // 3. Also add lessons that are not in sections
  if (course.lessons && course.lessons.length > 0) {
    // The query returns lessons in top-level AND in sections.
    // If we only want orphans (not in sections), we filter.
    const orphanedLessons = course.lessons.filter(
      (lesson: any) => !lesson.section_id
    );
    allLessons = [...allLessons, ...orphanedLessons];
  }

  // 4. Clone lessons
  const { newLessons } = await cloneLessons(allLessons, newCourse.id, sectionIdMap);

  // 5. Clone lesson languages
  await cloneLessonLanguages(newLessons || []);

  // 6. Clone exercises, questions, and options
  await cloneExercises(newLessons || []);

  return newCourse;
}
