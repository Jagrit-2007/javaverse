import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const BUCKET = process.env.S3_BUCKET || 'javaverse-uploads';
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.storage');

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

let bucketReady = false;

async function ensureBucket(): Promise<boolean> {
  if (bucketReady) return true;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    bucketReady = true;
    return true;
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      bucketReady = true;
      return true;
    } catch {
      return false;
    }
  }
}

function ensureLocalDir(prefix: 'quarantine' | 'clean'): string {
  const dir = path.join(LOCAL_STORAGE_DIR, prefix);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function getQuarantineFile(storageKey: string): Promise<Buffer | null> {
  const s3Ok = await ensureBucket();
  if (s3Ok) {
    try {
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: `quarantine/${storageKey}`,
        }),
      );
      if (res.Body) {
        const stream = res.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
    } catch {
      // Fallback to local
    }
  }

  const localPath = path.join(LOCAL_STORAGE_DIR, 'quarantine', storageKey);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  return null;
}

export async function putCleanFile(
  storageKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const s3Ok = await ensureBucket();
  if (s3Ok) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `clean/${storageKey}`,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return;
    } catch {
      // Fallback
    }
  }

  const dir = ensureLocalDir('clean');
  fs.writeFileSync(path.join(dir, storageKey), buffer);
}

export async function deleteQuarantineFile(storageKey: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: `quarantine/${storageKey}`,
      }),
    );
  } catch {
    // Ignore
  }

  const localPath = path.join(LOCAL_STORAGE_DIR, 'quarantine', storageKey);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      // Ignore
    }
  }
}
