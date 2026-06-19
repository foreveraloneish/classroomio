/**
 * Server-side MinIO Storage Handler
 * 
 * Handles file operations with MinIO S3-compatible storage.
 */

import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_URL?.replace(/^https?:\/\//, '') || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin'
});

/**
 * Upload a file to MinIO
 */
export async function uploadToMinIO(
    bucket: string,
    path: string,
    file: File
): Promise<{ id: string; path: string; error?: string }> {
    try {
        // Ensure bucket exists
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
            await minioClient.makeBucket(bucket, 'us-east-1');
        }

        const buffer = await file.arrayBuffer();
        const fileId = uuidv4();
        const fileName = `${fileId}-${path}`;

        await minioClient.putObject(bucket, fileName, Buffer.from(buffer), buffer.byteLength, {
            'Content-Type': file.type
        });

        return {
            id: fileId,
            path: fileName
        };
    } catch (error) {
        console.error('MinIO upload error:', error);
        return {
            id: '',
            path: '',
            error: error instanceof Error ? error.message : 'Upload failed'
        };
    }
}

/**
 * Delete a file from MinIO
 */
export async function deleteFromMinIO(bucket: string, path: string): Promise<string | null> {
    try {
        await minioClient.removeObject(bucket, path);
        return null;
    } catch (error) {
        console.error('MinIO delete error:', error);
        return error instanceof Error ? error.message : 'Delete failed';
    }
}

/**
 * Get file from MinIO
 */
export async function getFromMinIO(bucket: string, path: string): Promise<Buffer | null> {
    try {
        const chunks: Buffer[] = [];
        const stream = await minioClient.getObject(bucket, path);

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('MinIO get error:', error);
        return null;
    }
}

/**
 * List objects in a bucket
 */
export async function listFromMinIO(bucket: string, prefix?: string): Promise<string[]> {
    try {
        const files: string[] = [];
        const stream = minioClient.listObjects(bucket, prefix || '', false);

        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => files.push(obj.name));
            stream.on('end', () => resolve(files));
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('MinIO list error:', error);
        return [];
    }
}
