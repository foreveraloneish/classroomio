import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { title, body, organization_id, author_profile_id, slug, course_id } = await request.json();

    if (!title || !organization_id || !author_profile_id) return json({ success: false, message: 'Missing fields' }, { status: 400 });

    try {
        const question = await prisma.communityQuestion.create({ data: { title, body, organization_id, author_id: BigInt(author_profile_id), votes: 0, slug, course_id } });
        return json({ success: true, data: [question] });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
