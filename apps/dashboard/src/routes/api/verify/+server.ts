import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function GET({ url }) {
    const token = url.searchParams.get('token');

    if (!token) {
        return json({ success: false, message: 'Token required' }, { status: 400 });
    }

    try {
        const record = await prisma.verification.findUnique({ where: { id: token } });

        if (!record) {
            return json({ success: false, message: 'Invalid token' }, { status: 400 });
        }

        if (record.expiresAt && record.expiresAt < new Date()) {
            return json({ success: false, message: 'Token expired' }, { status: 400 });
        }

        const userId = record.identifier;

        // Mark user as email verified
        await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });

        // Remove token
        await prisma.verification.delete({ where: { id: token } });

        return json({ success: true, message: 'Email verified' });
    } catch (err) {
        console.error('Verification error', err);
        return json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
