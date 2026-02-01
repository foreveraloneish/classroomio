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
    const { organization_id, role_id } = body;

    try {
        const member = await prisma.organizationMember.create({
            data: {
                organization_id,
                role_id: BigInt(role_id),
                profile_id: session.user.id,
                verified: true
            }
        });

        return json({ data: [toJSON(member)], error: null });
    } catch (e: any) {
        console.error(e);
        return json({ data: null, error: { message: e.message } });
    }
}
