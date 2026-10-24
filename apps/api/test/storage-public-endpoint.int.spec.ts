import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { StorageService } from "../src/platform/storage/storage.module.js";
import { startStorage, type TestStorage } from "./support/storage.js";
import { testConfig } from "./support/test-config.js";

const DOWNLOAD = { expiresInSeconds: 300, contentType: "application/pdf", contentDisposition: "inline" };

/** Host lain yang menunjuk ke SeaweedFS uji yang sama, seperti `files.${DOMAIN}` di Nginx (issue #102). */
function aliasOf(endpoint: string): string {
  const url = new URL(endpoint);
  url.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
  return url.origin;
}

/** URL unduhan ditandatangani dengan endpoint publik; unggah tetap lewat endpoint internal (issue #102). */
describe("storage public endpoint", () => {
  let storage: TestStorage;
  const apps: NestFastifyApplication[] = [];

  const storageWith = async (publicEndpoint: string) => {
    const app = await createApp(testConfig({ storage: { ...storage.config, publicEndpoint } }));
    await app.init();
    apps.push(app);
    return app.get(StorageService);
  };

  beforeAll(async () => {
    storage = await startStorage();
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
    await storage?.stop();
  });

  it("signs the download URL with the public host, and the object downloads from it", async () => {
    const publicEndpoint = aliasOf(storage.config.endpoint);
    const service = await storageWith(publicEndpoint);
    await service.putObject("public/a.pdf", Buffer.from("%PDF-1.7 a"), "application/pdf");

    const url = await service.signedGetUrl("public/a.pdf", DOWNLOAD);

    expect(new URL(url).origin).toBe(publicEndpoint);
    const object = await fetch(url);
    expect(object.status).toBe(200);
    expect(Buffer.from(await object.arrayBuffer()).toString()).toBe("%PDF-1.7 a");
  });

  it("uploads through the internal endpoint even when the public host is not reachable from the api", async () => {
    const service = await storageWith("https://files.cikal-sit.example.id");

    await service.putObject("public/b.pdf", Buffer.from("%PDF-1.7 b"), "application/pdf");
    const url = await service.signedGetUrl("public/b.pdf", DOWNLOAD);

    expect((await storage.read("public/b.pdf")).toString()).toBe("%PDF-1.7 b");
    expect(new URL(url).origin).toBe("https://files.cikal-sit.example.id");
    expect(new URL(url).pathname).toBe(`/${storage.config.bucket}/public/b.pdf`);
  });
});
