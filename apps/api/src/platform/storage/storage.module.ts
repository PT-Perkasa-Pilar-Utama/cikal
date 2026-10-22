import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";

export const S3_CLIENT = Symbol("S3_CLIENT");

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
}

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new S3Client({
          endpoint: config.storage.endpoint,
          region: config.storage.region,
          forcePathStyle: config.storage.forcePathStyle,
          credentials: { accessKeyId: config.storage.accessKey, secretAccessKey: config.storage.secretKey },
          maxAttempts: 1,
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
