import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, siteName } = body;

    try {
        const org = await prisma.organization.create({
            data: {
                name,
                siteName
            }
        });
        return json({ data: [org], error: null });
    } catch (e: any) {
        return json({ data: null, error: { message: e.message } });
    }
}

export async function DELETE({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const { siteName } = await request.json();

    try {
        await prisma.organization.deleteMany({
            where: { siteName }
        });
        return json({ success: true });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
