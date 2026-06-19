import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function GET({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const courseId = url.searchParams.get('courseId');
    if (!courseId) return json({ success: false, message: 'courseId required' }, { status: 400 });

    try {
        const submissions = await prisma.submission.findMany({
            where: { course_id: courseId },
            include: { groupMember: { include: { user: true } }, exercise: true }
        });

        return json({ success: true, data: submissions });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
