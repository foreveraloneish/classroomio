import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, author_id, course_newsfeed_id } = body;

    const comment = await prisma.courseNewsfeedComment.create({
        data: {
            content,
            author_id,
            course_newsfeed_id
        }
    });

    return json({ success: true, data: [toJSON(comment)], error: null });
}

export async function DELETE({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'ID required' }, { status: 400 });

    await prisma.courseNewsfeedComment.delete({ where: { id } });

    return json({ success: true, error: null });
}
