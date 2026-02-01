import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function GET({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const courseId = url.searchParams.get('courseId');
    if (!courseId) return json({ error: 'Course ID required' }, { status: 400 });

    const feeds = await prisma.courseNewsfeed.findMany({
        where: { course_id: courseId },
        include: {
            author: {
                include: { user: true }
            },
            comments: {
                include: {
                    author: {
                        include: { user: true }
                    }
                },
                orderBy: { created_at: 'asc' }
            }
        },
        orderBy: { created_at: 'desc' }
    });

    // Transform to match frontend expectations
    const transformed = feeds.map(feed => ({
        ...feed,
        author: {
            profile: feed.author?.user
        },
        comment: feed.comments.map(c => ({
            ...c,
            author: {
                profile: c.author?.user
            }
        })),
        is_pinned: feed.is_pinned
    }));

    return json({ success: true, data: toJSON(transformed), error: null });
}

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, author_id, course_id, reaction } = body;

    const feed = await prisma.courseNewsfeed.create({
        data: {
            content,
            author_id,
            course_id,
            reaction: reaction || { like: [] }
        }
    });

    return json({ success: true, data: [toJSON(feed)], error: null });
}

export async function PUT({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, content, is_pinned, reaction } = body;

    const data: any = {};
    if (content !== undefined) data.content = content;
    if (is_pinned !== undefined) data.is_pinned = is_pinned;
    if (reaction !== undefined) data.reaction = reaction;

    const feed = await prisma.courseNewsfeed.update({
        where: { id },
        data
    });

    return json({ success: true, data: [toJSON(feed)], error: null });
}

export async function DELETE({ request, url }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'ID required' }, { status: 400 });

    await prisma.courseNewsfeedComment.deleteMany({ where: { course_newsfeed_id: id } });
    await prisma.courseNewsfeed.delete({ where: { id } });

    return json({ success: true, error: null });
}
