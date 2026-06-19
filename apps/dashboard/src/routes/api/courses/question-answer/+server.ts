import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function PUT({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { update, match } = body;

    if (!match) return json({ success: false, message: 'match required' }, { status: 400 });

    try {
        const updated = await prisma.questionAnswer.updateMany({ where: match, data: update });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
