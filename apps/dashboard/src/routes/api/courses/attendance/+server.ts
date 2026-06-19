import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const update = await request.json();

    try {
        // upsert logic: update any existing by course_id + student_id + lesson_id
        const promises = (update || []).map(async (item) => {
            const existing = await prisma.groupAttendance.findFirst({ where: { course_id: item.course_id, student_id: item.student_id, lesson_id: item.lesson_id } });
            if (existing) {
                return prisma.groupAttendance.update({ where: { id: existing.id }, data: item });
            }
            return prisma.groupAttendance.create({ data: item });
        });

        const results = await Promise.all(promises);
        return json({ success: true, data: results });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
