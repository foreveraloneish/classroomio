import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function GET({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const exerciseId = url.searchParams.get('exerciseId');
    const submittedBy = url.searchParams.get('submittedBy');

    if (!exerciseId) return json({ success: false, message: 'exerciseId required' }, { status: 400 });

    try {
        const where: any = { exercise_id: exerciseId };
        if (submittedBy) where.submitted_by = submittedBy;

        const submission = await prisma.submission.findFirst({ where, include: { questionAnswers: true } });

        return json({ success: true, data: submission });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function PUT({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status_id, total, feedback } = body;

    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        const updated = await prisma.submission.update({ where: { id }, data: { status_id: status_id ? BigInt(status_id) : undefined, total: total !== undefined ? BigInt(total) : undefined, feedback } });
        return json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return json({ success: false, message: 'id required' }, { status: 400 });

    try {
        await prisma.submission.delete({ where: { id } });
        return json({ success: true });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
