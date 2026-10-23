import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DomainError } from "../http/domain-error.js";

export const S3_CLIENT = Symbol("S3_CLIENT");

export function createS3Client(storage: AppConfig["storage"]): S3Client {
  return new S3Client({
    endpoint: storage.endpoint,
    region: storage.region,
    forcePathStyle: storage.forcePathStyle,
    credentials: { accessKeyId: storage.accessKey, secretAccessKey: storage.secretKey },
    maxAttempts: 1,
  });
}

/** Menghapus semua objek di bucket (reset state, api-specs 27 §27.4 langkah 6). Mengembalikan jumlah objek terhapus. */
export async function emptyBucket(client: S3Client, bucket: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }));
    const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
    if (keys.length === 0) return deleted;
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
    deleted += keys.length;
  }
}

/** Header respons yang ditanam di URL bertanda tangan. */
export interface SignedDownload {
  expiresInSeconds: number;
  contentType: string;
  contentDisposition: string;
}

/** Port storage S3-compatible (technical-specs 07 §7.7): bucket privat, unduhan lewat URL bertanda tangan. */
@Injectable()
export class StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async ping(signal: AbortSignal): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.storage.bucket }), { abortSignal: signal });
  }

  /** Storage tidak terjangkau dijawab `503 SERVICE_UNAVAILABLE` (api-specs 12 §12.7). */
  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.storage.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.client.send(command).catch(() => {
      throw DomainError.standard("SERVICE_UNAVAILABLE");
    });
  }

  /** URL GET yang ditandatangani lokal tanpa memanggil storage, sehingga file tidak lewat origin aplikasi. */
  signedGetUrl(key: string, download: SignedDownload): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.storage.bucket,
      Key: key,
      ResponseContentType: download.contentType,
      ResponseContentDisposition: download.contentDisposition,
    });
    return getSignedUrl(this.client, command, { expiresIn: download.expiresInSeconds });
  }

  emptyBucket(): Promise<number> {
    return emptyBucket(this.client, this.config.storage.bucket);
  }
}

@Global()
@Module({
  providers: [
    { provide: S3_CLIENT, inject: [APP_CONFIG], useFactory: (config: AppConfig) => createS3Client(config.storage) },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
