import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { course_id } = await request.json();
    if (!course_id) return json({ success: false, message: 'course_id required' }, { status: 400 });

    try {
        // Minimal conversion: set version to V2; maintaing actual conversion logic is out of scope here
        const updated = await prisma.course.update({ where: { id: course_id }, data: { version: 'V2' } });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
