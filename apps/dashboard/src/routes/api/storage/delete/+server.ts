import { json, type RequestHandler } from '@sveltejs/kit';
import { deleteFromMinIO } from '$lib/server/storage-minio';

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const { bucket, path } = await request.json();

        if (!bucket || !path) {
            return json(
                { message: 'Missing required fields: bucket, path' },
                { status: 400 }
            );
        }

        const error = await deleteFromMinIO(bucket, path);

        if (error) {
            return json({ message: error }, { status: 500 });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Delete endpoint error:', error);
        return json(
            { message: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
};
