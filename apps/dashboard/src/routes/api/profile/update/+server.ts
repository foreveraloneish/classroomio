import { auth } from '$lib/auth';
import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, fullname, username, avatar_url } = body;

    if (id !== session.user.id) return json({ error: 'Forbidden' }, { status: 403 });

    try {
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                fullname,
                username,
                avatar_url
            }
        });
        return json({ data: [toJSON(updatedUser)], error: null });
    } catch (e: any) {
        return json({ data: null, error: { message: e.message } });
    }
}
