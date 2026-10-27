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
/** Klien yang hanya menandatangani URL unduhan dengan endpoint publik; tidak pernah mengirim request. */
export const S3_SIGNING_CLIENT = Symbol("S3_SIGNING_CLIENT");

export function createS3Client(storage: AppConfig["storage"], endpoint = storage.endpoint): S3Client {
  return new S3Client({
    endpoint,
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

/** Menyimpan satu objek; dipakai `StorageService` dan seed di runner migrasi yang berjalan tanpa Nest. */
export async function putObject(
  client: S3Client,
  bucket: string,
  object: { key: string; body: Buffer; contentType: string },
): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: object.key, Body: object.body, ContentType: object.contentType }),
  );
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
    @Inject(S3_SIGNING_CLIENT) private readonly signer: S3Client,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async ping(signal: AbortSignal): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.storage.bucket }), { abortSignal: signal });
  }

  /** Storage tidak terjangkau dijawab `503 SERVICE_UNAVAILABLE` (api-specs 12 §12.7). */
  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await putObject(this.client, this.config.storage.bucket, { key, body, contentType }).catch(() => {
      throw DomainError.standard("SERVICE_UNAVAILABLE");
    });
  }

  /** Isi objek, contoh template Word; storage tidak terjangkau dijawab `503 SERVICE_UNAVAILABLE`. */
  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.config.storage.bucket, Key: key });
    const object = await this.client.send(command).catch(() => {
      throw DomainError.standard("SERVICE_UNAVAILABLE");
    });
    if (!object.Body) throw new Error(`Storage object ${key} has no body`);
    return Buffer.from(await object.Body.transformToByteArray());
  }

  /**
   * URL GET yang ditandatangani lokal tanpa memanggil storage, sehingga file tidak lewat origin aplikasi. Host URL
   * adalah endpoint publik yang dijangkau browser (issue #102).
   */
  signedGetUrl(key: string, download: SignedDownload): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.storage.bucket,
      Key: key,
      ResponseContentType: download.contentType,
      ResponseContentDisposition: download.contentDisposition,
    });
    return getSignedUrl(this.signer, command, { expiresIn: download.expiresInSeconds });
  }

  emptyBucket(): Promise<number> {
    return emptyBucket(this.client, this.config.storage.bucket);
  }
}

@Global()
@Module({
  providers: [
    { provide: S3_CLIENT, inject: [APP_CONFIG], useFactory: (config: AppConfig) => createS3Client(config.storage) },
    {
      provide: S3_SIGNING_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createS3Client(config.storage, config.storage.publicEndpoint),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
