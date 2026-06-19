import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function PUT({ request }) {
    const body = await request.json();
    const { id, update } = body;

    if (!id || !update) {
        return json({ success: false, message: 'Missing params' }, { status: 400 });
    }

    try {
        const org = await prisma.organization.update({ where: { id }, data: update });
        return json({ success: true, data: org });
    } catch (err) {
        console.error('Failed to update org', err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
