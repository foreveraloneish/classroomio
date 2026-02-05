import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function POST({ request }) {
    const { name, email, phone, message, organization_id } = await request.json();

    if (!organization_id || !name || !email) {
        return json({ success: false, message: 'Missing params' }, { status: 400 });
    }

    try {
        const entry = await prisma.organizationContact.create({
            data: { name, email, phone, message, organization_id }
        });

        return json({ success: true, data: entry });
    } catch (err) {
        console.error('Failed to save contact', err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
