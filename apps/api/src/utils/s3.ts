import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type GetSignedUrlParameters = Parameters<typeof getSignedUrl>;

// Use Environment variables for MinIO/S3
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';

export const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: true, // Needed for MinIO usually
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY
  }
});

export async function uploadToS3(
  params: PutObjectCommandInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await s3Client.send(new PutObjectCommand(params));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getFromS3(
  params: GetObjectCommandInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteFromS3(
  params: DeleteObjectCommandInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await s3Client.send(new DeleteObjectCommand(params));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
