import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function GET({ url }) {
    const slug = url.searchParams.get('slug');
    if (!slug) return json({ success: false, message: 'slug required' }, { status: 400 });

    try {
        const q = await prisma.communityQuestion.findUnique({
            where: { slug },
            include: { author: { include: { user: true } }, comments: { include: { author: { include: { user: true } } } }, course: true }
        });

        if (!q) return json({ success: false, message: 'Not found' }, { status: 404 });

        return json({ success: true, data: q });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function PUT({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, title, body: content, course_id } = body;
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        const updated = await prisma.communityQuestion.update({ where: { id: Number(id) }, data: { title, body: content, course_id } });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        await prisma.communityAnswer.deleteMany({ where: { question_id: Number(id) } });
        await prisma.communityQuestion.delete({ where: { id: Number(id) } });
        return json({ success: true });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
