import { Hono } from 'hono';
import { prisma } from '@cio/database';
import { getIO } from '$src/services/socket';
import { authMiddleware } from '$src/middlewares/auth';

const app = new Hono<{ Variables: { user: any } }>();

app.use('*', authMiddleware);

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

app.get('/:courseId', async (c) => {
    const courseId = c.req.param('courseId');
    const polls = await prisma.appsPoll.findMany({
        where: { courseId },
        include: {
            author: {
                include: { user: true }
            },
            options: {
                include: {
                    submissions: {
                        include: {
                            selectedBy: {
                                include: { user: true }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
    return c.json({ data: toJSON(polls), error: null });
});

app.post('/', async (c) => {
    const body = await c.req.json();
    const { courseId, question, options, status, expiration } = body;
    const user = c.get('user');

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course?.group_id) return c.json({ error: 'Course invalid' }, 400);

    const member = await prisma.groupMember.findFirst({
        where: { group_id: course.group_id, profile_id: (user as any).id }
    });

    if (!member) return c.json({ error: 'Member not found' }, 403);

    const poll = await prisma.appsPoll.create({
        data: {
            courseId,
            question,
            status,
            expiration,
            authorId: member.id,
            options: {
                create: options.map((o: any) => ({ label: o.label }))
            }
        },
        include: { options: true }
    });

    getIO()?.to(`course:${courseId}`).emit('poll:new', toJSON(poll));

    return c.json({ data: [toJSON(poll)], error: null });
});

app.post('/vote', async (c) => {
    const { pollId, pollOptionId, add, courseId } = await c.req.json();
    const user = c.get('user');

    const poll = await prisma.appsPoll.findUnique({ where: { id: pollId }, include: { course: true } });
    if (!poll?.course?.group_id) return c.json({ error: 'Poll not found' }, 404);

    const member = await prisma.groupMember.findFirst({
        where: { group_id: poll.course.group_id, profile_id: (user as any).id }
    });
    if (!member) return c.json({ error: 'Member not found' }, 403);

    if (add) {
        await prisma.appsPollSubmission.create({
            data: {
                poll_id: pollId,
                poll_option_id: BigInt(pollOptionId),
                selected_by_id: member.id
            }
        });
    } else {
        // Need ID for delete or deleteMany
        await prisma.appsPollSubmission.deleteMany({
            where: {
                poll_id: pollId,
                poll_option_id: BigInt(pollOptionId),
                selected_by_id: member.id
            }
        });
    }

    const payload = {
        poll_id: pollId,
        poll_option_id: pollOptionId,
        selected_by_id: member.id,
        add
    };

    getIO()?.to(`course:${poll.courseId}`).emit('poll:vote', toJSON(payload));

    return c.json({ success: true });
});

export const pollRouter = app;
