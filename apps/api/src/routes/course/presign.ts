import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  ZCourseDocumentPresignUrlUpload,
  ZCourseDownloadPresignedUrl,
  ZCoursePresignUrlUpload
} from '$src/types/course';
import { describeRoute, validator } from 'hono-openapi';

import { BUCKET_NAME } from '$src/constants/upload';
import type { GetSignedUrlParameters } from '$src/utils/s3';
import { Hono } from 'hono';
import { authMiddleware } from '$src/middlewares/auth';
import { generateFileKey } from '$src/utils/upload';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '$src/utils/s3';
import { z } from 'zod';

// Response schemas for OpenAPI documentation
const PresignUploadResponse = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    url: { type: 'string' as const },
    fileKey: { type: 'string' as const },
    message: { type: 'string' as const }
  },
  required: ['success', 'url', 'fileKey', 'message']
};

const PresignDownloadResponse = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    urls: {
      type: 'object' as const,
      additionalProperties: { type: 'string' as const }
    },
    message: { type: 'string' as const }
  },
  required: ['success', 'urls', 'message']
};

const ZUpload = z.object({
    fileName: z.string(),
    fileType: z.string(),
    bucket: z.string().optional().default(BUCKET_NAME.VIDEOS)
});

export const presignRouter = new Hono()
  .post(
    '/upload',
    authMiddleware,
    describeRoute({
        description: 'Generic upload presign',
        responses: {
            200: { description: 'Success' }
        },
        tags: ['Presign']
    }),
    validator('json', ZUpload),
    async (c) => {
        const { fileName, fileType, bucket } = c.req.valid('json');
        const fileKey = generateFileKey(fileName); // or use fileName if path structure needed

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            ContentType: fileType
        });

        const presignedUrl = await getSignedUrl(s3Client as any, command, {
            expiresIn: 3600
        });

        return c.json({
            success: true,
            url: presignedUrl,
            fileKey,
            message: 'Pre-signed URL generated'
        });
    }
  )
  .post(
    '/video/upload',
    authMiddleware,
    describeRoute({
      description: 'Generate a pre-signed URL for video upload',
      responses: {
        200: {
          description: 'Pre-signed URL generated successfully',
          content: {
            'application/json': {
              schema: PresignUploadResponse
            }
          }
        },
        400: {
          description: 'Invalid request body'
        },
        401: {
          description: 'Unauthorized'
        }
      },
      tags: ['Presign']
    }),
    validator('json', ZCoursePresignUrlUpload),
    async (c) => {
      const body = c.req.valid('json');

      const { fileName, fileType } = body;
      const fileKey = generateFileKey(fileName);

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME.VIDEOS,
        Key: fileKey,
        ContentType: fileType
      }) as GetSignedUrlParameters[1];

      const presignedUrl = await getSignedUrl(s3Client as GetSignedUrlParameters[0], command, {
        expiresIn: 3600
      });

      return c.json({
        success: true,
        url: presignedUrl,
        fileKey,
        message: 'Pre-signed URL generated successfully'
      });
    }
  )
  .post(
    '/document/upload',
    authMiddleware,
    describeRoute({
      description: 'Generate a pre-signed URL for document upload',
      responses: {
        200: {
          description: 'Document pre-signed URL generated successfully',
          content: {
            'application/json': {
              schema: PresignUploadResponse
            }
          }
        },
        400: {
          description: 'Invalid request body'
        },
        401: {
          description: 'Unauthorized'
        }
      },
      tags: ['Presign']
    }),
    validator('json', ZCourseDocumentPresignUrlUpload),
    async (c) => {
      const body = c.req.valid('json');

      const { fileName, fileType } = body;
      const fileKey = generateFileKey(fileName);

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME.DOCUMENTS,
        Key: fileKey,
        ContentType: fileType
      }) as GetSignedUrlParameters[1];

      const presignedUrl = await getSignedUrl(s3Client as GetSignedUrlParameters[0], command, {
            expiresIn: 3600
      });

      return c.json({
        success: true,
        url: presignedUrl,
        fileKey,
        message: 'Document pre-signed URL generated successfully'
      });
    }
  )
  .post(
    '/video/download',
    authMiddleware,
    describeRoute({
      description: 'Generate pre-signed URLs for video download',
      responses: {
        200: {
          description: 'Video URLs retrieved successfully',
          content: {
            'application/json': {
              schema: PresignDownloadResponse
            }
          }
        },
        400: {
          description: 'Invalid request body'
        },
        401: {
          description: 'Unauthorized'
        }
      },
      tags: ['Presign']
    }),
    validator('json', ZCourseDownloadPresignedUrl),
    async (c) => {
      const body = c.req.valid('json');

      const { keys } = body;

      const signedUrls: Record<string, string> = {};

      const urlPromises = keys.map(async (key) => {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME.VIDEOS,
          Key: key
        }) as GetSignedUrlParameters[1];

        const presignedUrl = await getSignedUrl(s3Client as GetSignedUrlParameters[0], command, {
          expiresIn: 3600
        });

        return { key, presignedUrl };
      });

      const results = await Promise.all(urlPromises);

      results.forEach(({ key, presignedUrl }) => {
        signedUrls[key] = presignedUrl;
      });

      return c.json({
        success: true,
        urls: signedUrls,
        message: 'Video URLs retrieved successfully'
      });
    }
  )
  .post(
    '/document/download',
    authMiddleware,
    describeRoute({
      description: 'Generate pre-signed URLs for document download',
      responses: {
        200: {
          description: 'Document URLs retrieved successfully',
          content: {
            'application/json': {
              schema: PresignDownloadResponse
            }
          }
        },
        400: {
          description: 'Invalid request body'
        },
        401: {
          description: 'Unauthorized'
        }
      },
      tags: ['Presign']
    }),
    validator('json', ZCourseDownloadPresignedUrl),
    async (c) => {
      const body = c.req.valid('json');

      const { keys } = body;

      const signedUrls: Record<string, string> = {};

      const urlPromises = keys.map(async (key) => {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME.DOCUMENTS,
          Key: key
        }) as GetSignedUrlParameters[1];

        const presignedUrl = await getSignedUrl(s3Client as GetSignedUrlParameters[0], command, {
          expiresIn: 3600
        });

        return { key, presignedUrl };
      });

      const results = await Promise.all(urlPromises);

      results.forEach(({ key, presignedUrl }) => {
        signedUrls[key] = presignedUrl;
      });

      return c.json({
        success: true,
        urls: signedUrls,
        message: 'Document URLs retrieved successfully'
      });
    }
  );
