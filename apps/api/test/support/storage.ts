import { CreateBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import type { AppConfig } from "../../src/platform/config/config.js";
import type { SeedContext } from "../../src/platform/migrate/module-data.js";
import { createS3Client, putObject } from "../../src/platform/storage/storage.module.js";

const S3_PORT = 9000;
const BUCKET = "cikal-test";
const ACCESS_KEY = "test-access";
const SECRET_KEY = "test-secret-key";
const READY_ATTEMPTS = 30;

/** Satu identitas S3 sehingga bucket privat dan tanda tangan URL benar-benar diperiksa. */
const S3_IDENTITIES = JSON.stringify({
  identities: [
    {
      name: "cikal",
      credentials: [{ accessKey: ACCESS_KEY, secretKey: SECRET_KEY }],
      actions: ["Admin", "Read", "Write", "List", "Tagging"],
    },
  ],
});

export interface TestStorage {
  config: AppConfig["storage"];
  /** Isi objek di bucket uji. */
  read(key: string): Promise<Buffer>;
  /** Penulis objek seed ke bucket uji. */
  putObject: SeedContext["putObject"];
  stop(): Promise<void>;
}

/** SeaweedFS mode S3 seperti compose dev (DEPLOYMENT_PLAN §2), dengan bucket uji kosong. */
export async function startStorage(): Promise<TestStorage> {
  const container: StartedTestContainer = await new GenericContainer("chrislusf/seaweedfs:3.97")
    .withCopyContentToContainer([{ content: S3_IDENTITIES, target: "/etc/seaweedfs/s3.json" }])
    .withCommand(["server", "-dir=/data", "-s3", `-s3.port=${S3_PORT}`, "-s3.config=/etc/seaweedfs/s3.json"])
    .withExposedPorts(S3_PORT)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const endpoint = `http://${container.getHost()}:${container.getMappedPort(S3_PORT)}`;
  const config: AppConfig["storage"] = {
    endpoint,
    publicEndpoint: endpoint,
    region: "us-east-1",
    bucket: BUCKET,
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
    forcePathStyle: true,
  };
  const client = createS3Client(config);
  // Port S3 terbuka sebelum master dan filer siap; bucket dibuat begitu SeaweedFS menerimanya.
  for (let attempt = 1; ; attempt++) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      break;
    } catch (error) {
      if (attempt === READY_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return {
    config,
    async read(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      return Buffer.from((await object.Body?.transformToByteArray()) ?? []);
    },
    putObject: (object) => putObject(client, BUCKET, object),
    async stop() {
      client.destroy();
      await container.stop();
    },
  };
}
