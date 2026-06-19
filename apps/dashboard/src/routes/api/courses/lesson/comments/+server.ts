import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function GET({ url }) {
    const lessonId = url.searchParams.get('lessonId');
    const page = Number(url.searchParams.get('page') || '0');
    const pageSize = Number(url.searchParams.get('pageSize') || '20');

    if (!lessonId) return json({ success: false, message: 'LessonId required' }, { status: 400 });

    try {
        const from = page * pageSize;

        const [comments, count] = await Promise.all([
            prisma.lessonComment.findMany({
                where: { lesson_id: lessonId },
                include: { groupMember: { include: { user: true } } },
                orderBy: { created_at: 'desc' },
                skip: from,
                take: pageSize
            }),
            prisma.lessonComment.count({ where: { lesson_id: lessonId } })
        ]);

        const result = comments.map((c) => ({
            id: c.id,
            comment: c.comment,
            created_at: c.created_at,
            groupmember: { id: c.groupmember_id, profile: { fullname: c.groupMember?.user?.fullname, avatar_url: c.groupMember?.user?.avatar_url } }
        }));

        return json({ success: true, data: result, count });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function POST({ request }) {
    const { lesson_id, groupmember_id, comment } = await request.json();

    if (!lesson_id || !groupmember_id || !comment) return json({ success: false, message: 'Missing params' }, { status: 400 });

    try {
        const inserted = await prisma.lessonComment.create({ data: { lesson_id, groupmember_id, comment } });
        return json({ success: true, data: inserted });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function PUT({ request }) {
    const { id, comment } = await request.json();
    if (!id || comment === undefined) return json({ success: false, message: 'Missing params' }, { status: 400 });

    try {
        const updated = await prisma.lessonComment.update({ where: { id: Number(id) }, data: { comment } });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE({ url }) {
    const id = url.searchParams.get('id');
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        await prisma.lessonComment.delete({ where: { id: Number(id) } });
        return json({ success: true });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
