import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET') || 'travel-operation-dev';

    this.enabled = Boolean(endpoint && accessKeyId && secretAccessKey);

    if (this.enabled) {
      this.client = new S3Client({
        region: this.config.get<string>('R2_REGION') || 'auto',
        endpoint,
        credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
        forcePathStyle: true,
      });
    } else {
      this.client = null;
      this.logger.warn(
        'Storage (R2) not configured — presigned URL endpoints will error until R2_* env vars are set.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  buildKey(tenantId: string, category: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `tenants/${tenantId}/${category.toLowerCase()}/${stamp}-${safeName}`;
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      throw new Error(
        'Storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
      );
    }
    return this.client;
  }

  async getUploadUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.ensureClient(), command, { expiresIn });
  }

  async getDownloadUrl(key: string, fileName?: string, expiresIn = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(fileName
        ? { ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"` }
        : {}),
    });
    return getSignedUrl(this.ensureClient(), command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
