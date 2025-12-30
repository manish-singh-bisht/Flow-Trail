import {
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './client.js';
import { env } from '../config/env.js';

export async function ensureBucketExists(): Promise<void> {
  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: env.S3_BUCKET,
      })
    );
    console.log(`S3 bucket "${env.S3_BUCKET}" already exists`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
      console.log(`Creating S3 bucket "${env.S3_BUCKET}"...`);
      try {
        await s3Client.send(
          new CreateBucketCommand({
            Bucket: env.S3_BUCKET,
          })
        );
        console.log(`S3 bucket "${env.S3_BUCKET}" created successfully`);
      } catch (createError: any) {
        if (
          createError.name === 'BucketAlreadyExists' ||
          createError.name === 'BucketAlreadyOwnedByYou'
        ) {
          console.log(`S3 bucket "${env.S3_BUCKET}" already exists (race condition)`);
        } else {
          throw new Error(
            `Failed to create S3 bucket "${env.S3_BUCKET}": ${createError.message || createError}`
          );
        }
      }
    } else {
      throw new Error(`Failed to check S3 bucket "${env.S3_BUCKET}": ${error.message || error}`);
    }
  }
}

export async function uploadToS3(key: string, data: any): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  });

  try {
    await s3Client.send(command);
    return key;
  } catch (error: any) {
    if (error.name === 'NoSuchBucket') {
      console.log('Checking S3 bucket...');
      await ensureBucketExists();
      console.log('S3 bucket created successfully');
      await s3Client.send(command);
      return key;
    }
    throw error;
  }
}

export async function getFromS3(key: string): Promise<any> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const body = await response.Body?.transformToString();

  if (!body) {
    throw new Error(`No data found for key: ${key}`);
  }

  return JSON.parse(body);
}

export function getS3Url(key: string): string {
  if (env.S3_FORCE_PATH_STYLE === 'true') {
    return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
  }
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

export async function getPresignedUploadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: 'application/json',
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
