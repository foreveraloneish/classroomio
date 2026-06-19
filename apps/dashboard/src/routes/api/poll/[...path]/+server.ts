import { PUBLIC_SERVER_URL } from '$env/static/public';

const API_URL = PUBLIC_SERVER_URL || 'http://localhost:3002';

export async function GET({ params, request, fetch, url }) {
    const targetUrl = `${API_URL}/poll/${params.path}${url.search}`;
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');

    return fetch(targetUrl, {
        method: 'GET',
        headers
    });
}

export async function POST({ params, request, fetch, url }) {
    const targetUrl = `${API_URL}/poll/${params.path || ''}${url.search}`;
    const body = await request.text();
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');

    return fetch(targetUrl, {
        method: 'POST',
        headers,
        body
    });
}

export async function DELETE({ params, request, fetch, url }) {
    const targetUrl = `${API_URL}/poll/${params.path}${url.search}`;
    const body = await request.text(); // Some deletes have body?
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');

    return fetch(targetUrl, {
        method: 'DELETE',
        headers,
        body: body || undefined
    });
}

export async function PUT({ params, request, fetch, url }) {
    const targetUrl = `${API_URL}/poll/${params.path}${url.search}`;
    const body = await request.text();
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');

    return fetch(targetUrl, {
        method: 'PUT',
        headers,
        body
    });
}
