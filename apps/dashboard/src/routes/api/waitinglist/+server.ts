import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const { email } = await request.json();

    if (!email) return json({ error: 'Email required' }, { status: 400 });

    try {
        await prisma.waitingList.create({
            data: { email }
        });
        return json({ success: true });
    } catch (e) {
        return json({ error: 'Error adding to waiting list' }, { status: 500 });
    }
}
