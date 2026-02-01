import { PUBLIC_SERVER_URL } from '$env/static/public';
import { auth } from '$lib/auth';
import { json } from '@sveltejs/kit';

const API_URL = PUBLIC_SERVER_URL || 'http://localhost:3002';

export async function POST({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const { fileName, fileType, bucket } = await request.json();

    const res = await fetch(`${API_URL}/course/presign/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.token}` // Or how BetterAuth exposes token?
            // BetterAuth session token might not be the JWT expected by API if not configured.
            // If API uses same DB, it can verify session token.
            // My API validateUser checks `auth.api.getSession`.
            // So we need to pass the cookie!
        },
        body: JSON.stringify({ fileName, fileType, bucket })
    });

    // Actually, passing headers (cookies) is better if API and Dashboard share domain?
    // They are on different ports localhost:5173 vs localhost:3002.
    // Cookies might not pass easily unless configured.
    // But `session.session.token` is the Bearer token if using Bearer.
    // validateUser in API uses `auth.api.getSession({ headers })`.
    // It parses Authorization header or Cookie.
    // So sending Authorization: Bearer <token> should work if `better-auth` supports it.

    // session object from `auth.api.getSession` has `session.token`.
    // Let's try passing it.

    // If fail, we might need to proxy the Cookie header.

    // API `validateUser` calls `auth.api.getSession`.

    const data = await res.json();
    return json(data);
}
