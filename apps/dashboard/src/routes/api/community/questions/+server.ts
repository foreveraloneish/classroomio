import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function POST({ request }) {
    const { courseIds } = await request.json();

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return json({ success: true, data: [] });
    }

    try {
        const questions = await prisma.communityQuestion.findMany({
            where: { course_id: { in: courseIds } },
            include: { author: { include: { user: true } } },
            orderBy: { created_at: 'desc' }
        });

        const result = await Promise.all(
            questions.map(async (q) => {
                const commentsCount = await prisma.communityAnswer.count({ where: { question_id: q.id } });
                return {
                    organization_id: q.organization_id,
                    course_id: q.course_id,
                    title: q.title,
                    votes: q.votes,
                    created_at: q.created_at,
                    slug: q.slug,
                    comments: commentsCount,
                    author: { fullname: q.author?.user?.fullname || '' },
                    course: { title: '' }
                };
            })
        );

        return json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
