import { json, type RequestHandler } from '@sveltejs/kit';
import { uploadToMinIO, deleteFromMinIO } from '$lib/server/storage-minio';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;
        const bucket = formData.get('bucket') as string;

        if (!file || !path || !bucket) {
            return json(
                { message: 'Missing required fields: file, path, bucket' },
                { status: 400 }
            );
        }

        const result = await uploadToMinIO(bucket, path, file);

        if (result.error) {
            return json({ message: result.error }, { status: 500 });
        }

        return json({
            id: result.id,
            path: result.path,
            fullPath: `${bucket}/${path}`
        });
    } catch (error) {
        console.error('Upload endpoint error:', error);
        return json(
            { message: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
};
