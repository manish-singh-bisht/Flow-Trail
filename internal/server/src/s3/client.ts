import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

var s3ClientSingleton: S3Client | null = null;

const getS3Client = () => {
  if (s3ClientSingleton) {
    return s3ClientSingleton;
  }
  s3ClientSingleton = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
  });
  return s3ClientSingleton;
};

const s3Client = getS3Client();

export { s3Client };
