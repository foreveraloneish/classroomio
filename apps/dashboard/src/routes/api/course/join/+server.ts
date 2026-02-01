import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { courseId, roleId } = body;

    try {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course?.group_id) return json({ error: 'Course invalid' }, { status: 400 });

        const member = await prisma.groupMember.create({
            data: {
                profile_id: session.user.id,
                group_id: course.group_id,
                role_id: BigInt(roleId)
            }
        });

        // Fetch teachers for notification
        const teachers = await prisma.groupMember.findMany({
            where: {
                group_id: course.group_id,
                role_id: BigInt(2) // Tutor role
            },
            include: { user: true }
        });

        return json({
            data: member,
            error: null,
            teachers: teachers.map(t => t.user?.email).filter(Boolean)
        });
    } catch (e: any) {
        return json({ data: null, error: { message: e.message } });
    }
}
