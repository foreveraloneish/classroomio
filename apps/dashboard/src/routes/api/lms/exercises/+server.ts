import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';
import { auth } from '$lib/auth';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { profileId, orgId } = await request.json();
    if (!profileId || !orgId) return json({ success: false, message: 'Missing params' }, { status: 400 });

    try {
        const exercises = await prisma.exercise.findMany({
            where: {
                lesson: {
                    is_unlocked: true,
                    course: {
                        group: {
                            organization_id: orgId,
                            members: { some: { profile_id: profileId } }
                        }
                    }
                }
            },
            include: {
                questions: { select: { points: true } },
                submissions: {
                    where: { submitted_by: { in: await prisma.groupMember.findMany({ where: { profile_id: profileId }, select: { id: true } }).then((ms) => ms.map((m) => m.id)) } },
                    include: { groupMember: { include: { user: true } } },
                    take: 1
                },
                lesson: {
                    select: { id: true, title: true, order: true, course: { select: { id: true, title: true } } }
                }
            }
        });

        return json({ success: true, data: exercises });
    } catch (err) {
        console.error(err);
        return json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
