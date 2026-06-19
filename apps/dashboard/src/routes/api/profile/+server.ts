import { auth } from '$lib/auth';
import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function GET({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user) return json({ data: null, error: 'User not found' });

    return json({ data: toJSON(user), error: null });
}
