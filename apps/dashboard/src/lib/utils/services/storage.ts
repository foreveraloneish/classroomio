import { PUBLIC_SERVER_URL } from '$env/static/public';

const API_URL = PUBLIC_SERVER_URL || 'http://localhost:3002';

export async function getPresignedUrl(fileName: string, fileType: string, bucket: string = 'avatars') {
    const res = await fetch(`${API_URL}/course/presign/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Auth header injected by interceptor or manually?
            // Dashboard should handle auth.
            // Client side calls.
        },
        body: JSON.stringify({ fileName, fileType, bucket })
    });
    return await res.json();
}

export async function uploadFile(file: File, bucket: string = 'avatars') {
    // 1. Get presigned URL
    // We need auth token.
    // Let's assume we proxy via Next/SvelteKit API or call API directly with token.
    // Calling API directly requires token.
    // Let's use a proxy in SvelteKit to inject token?

    // Simplest: Proxy via SvelteKit API route which calls Hono API.
    const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileType: file.type, bucket })
    });
    const { url, fileKey, error } = await presignRes.json();

    if (error || !url) throw new Error(error || 'Failed to get upload URL');

    // 2. Upload to R2
    const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    // Return public URL (assuming public bucket access or CDN)
    // Adjust based on your R2 setup (e.g. public.r2.dev or custom domain)
    // For now returning key, caller constructs URL or API returns full public URL.

    // Assuming we have a public domain for R2:
    const publicDomain = 'https://cdn.classroomio.com'; // Replace with env var?
    return {
        path: fileKey,
        publicUrl: `${publicDomain}/${bucket}/${fileKey}` // Structure depends on R2 custom domain setup
    };
}
