import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { table, id } = await request.json();
    if (!table || !id) return json({ success: false, message: 'Missing params' }, { status: 400 });

    try {
        if (table === 'community_question') {
            const updated = await prisma.communityQuestion.update({ where: { id: Number(id) }, data: { votes: { increment: 1 } } });
            return json({ success: true, data: updated });
        }
        if (table === 'community_answer') {
            const updated = await prisma.communityAnswer.update({ where: { id: String(id) }, data: { votes: { increment: 1 } } });
            return json({ success: true, data: updated });
        }

        return json({ success: false, message: 'Unknown table' }, { status: 400 });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
