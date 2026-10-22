import { DeleteObjectsCommand, HeadBucketCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";

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

/** Port storage S3-compatible (technical-specs 07 §7.7). Unggah dan URL bertanda tangan dipasang di TL-S3-02. */
@Injectable()
export class StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async ping(signal: AbortSignal): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.storage.bucket }), { abortSignal: signal });
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
