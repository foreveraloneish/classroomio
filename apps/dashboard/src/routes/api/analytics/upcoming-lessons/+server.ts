import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { profileId, orgId, startAt, endAt } = await request.json();

    if (!profileId || !orgId) return json({ success: false, message: 'Missing params' }, { status: 400 });

    try {
        const lessons = await prisma.lesson.findMany({
            where: {
                course: { group: { organization_id: orgId } },
                lesson_at: { gte: startAt, lte: endAt }
            }
        });

        return json({ success: true, data: lessons });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
