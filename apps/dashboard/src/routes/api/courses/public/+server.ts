import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function GET({ url }) {
    const siteName = url.searchParams.get('siteName');

    if (!siteName) return json({ data: [], error: 'Missing siteName' }, { status: 400 });

    try {
        const courses = await prisma.course.findMany({
            where: {
                group: {
                    organization: {
                        siteName: siteName
                    }
                },
                status: 'ACTIVE',
                is_published: true
            },
            include: {
                _count: {
                    select: { lessons: true }
                },
                group: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                siteName: true,
                                avatar_url: true
                            }
                        }
                    }
                }
            }
        });

        return json({ data: toJSON(courses), error: null });
    } catch (e: any) {
        return json({ data: [], error: e.message });
    }
}
