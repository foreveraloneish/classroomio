import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { email, organization_id } = body;

    try {
        // Verify user is the one accepting
        if (session.user.email !== email) return json({ error: 'Email mismatch' }, { status: 403 });

        // Check if member exists (invited)
        const member = await prisma.organizationMember.findFirst({
            where: {
                organization_id,
                email
            }
        });

        if (!member) return json({ error: 'Invite not found' }, { status: 404 });

        const updatedMember = await prisma.organizationMember.update({
            where: { id: member.id },
            data: {
                verified: true,
                profile_id: session.user.id
            }
        });

        return json({ data: updatedMember, error: null });
    } catch (e: any) {
        return json({ data: null, error: { message: e.message } });
    }
}
