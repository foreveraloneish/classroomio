import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { body, question_id, author_profile_id } = await request.json();
    if (!body || !question_id) return json({ success: false, message: 'Missing fields' }, { status: 400 });

    try {
        const ans = await prisma.communityAnswer.create({ data: { body, question_id: Number(question_id), author_id: BigInt(author_profile_id), votes: 0 } });
        return json({ success: true, data: [ans] });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function PUT({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id, body } = await request.json();
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        const updated = await prisma.communityAnswer.update({ where: { id: String(id) }, data: { body } });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        await prisma.communityAnswer.delete({ where: { id: String(id) } });
        return json({ success: true });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
