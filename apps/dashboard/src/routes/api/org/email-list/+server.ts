import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function POST({ request }) {
    const { email, organization_id } = await request.json();

    if (!email || !organization_id) {
        return json({ success: false, message: 'Missing params' }, { status: 400 });
    }

    try {
        const entry = await prisma.organizationEmailList.create({
            data: { email, organization_id }
        });

        return json({ success: true, data: entry });
    } catch (err) {
        console.error('Failed to save email', err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
