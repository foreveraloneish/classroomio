/**
 * MinIO Storage Utility
 * 
 * Handles file uploads and retrieval using MinIO S3-compatible storage.
 * Replaces Supabase storage functionality.
 */

const MINIO_URL = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000';
const MINIO_BUCKET = 'classroomio';

export interface StorageUploadOptions {
    cacheControl?: string;
    contentType?: string;
    metadata?: Record<string, string>;
}

export interface StorageUploadResult {
    data: {
        id: string;
        path: string;
        fullPath: string;
    } | null;
    error: Error | null;
}

export interface StoragePublicUrlResult {
    data: {
        publicUrl: string;
    };
    error: Error | null;
}

/**
 * Upload a file to MinIO storage
 */
export async function uploadToStorage(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: StorageUploadOptions
): Promise<StorageUploadResult> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('bucket', bucket);

        if (options?.contentType) {
            formData.append('contentType', options.contentType);
        }

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();
        return {
            data: {
                id: result.id,
                path: result.path,
                fullPath: result.fullPath
            },
            error: null
        };
    } catch (error) {
        console.error('Storage upload error:', error);
        return {
            data: null,
            error: error instanceof Error ? error : new Error('Unknown upload error')
        };
    }
}

/**
 * Get public URL for a file in MinIO storage
 */
export function getPublicUrl(bucket: string, path: string): StoragePublicUrlResult {
    try {
        const publicUrl = `${MINIO_URL}/${bucket}/${path}`;
        return {
            data: {
                publicUrl
            },
            error: null
        };
    } catch (error) {
        console.error('Get public URL error:', error);
        return {
            data: { publicUrl: '' },
            error: error instanceof Error ? error : new Error('Unknown error')
        };
    }
}

/**
 * Delete a file from MinIO storage
 */
export async function deleteFromStorage(bucket: string, path: string): Promise<{ error: Error | null }> {
    try {
        const response = await fetch('/api/storage/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bucket, path })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Delete failed');
        }

        return { error: null };
    } catch (error) {
        console.error('Storage delete error:', error);
        return {
            error: error instanceof Error ? error : new Error('Unknown delete error')
        };
    }
}
