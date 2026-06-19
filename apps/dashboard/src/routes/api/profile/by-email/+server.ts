import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

function toJSON(data: unknown) {
    return JSON.parse(
        JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
    );
}

export async function GET({ url }) {
    const email = url.searchParams.get('email');

    if (!email) {
        return json({ data: null, error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            fullname: true,
            avatar_url: true
        }
    });

    if (!user) {
        return json({ data: null, error: 'User not found' }, { status: 404 });
    }

    return json({ data: toJSON(user), error: null });
}
