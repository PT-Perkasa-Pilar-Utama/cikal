import { describe, expect, it } from "vitest";
import { envSchema } from "./config.js";

const BASE_ENV = {
  DATABASE_URL: "postgres://cikal_app:app@localhost:55432/cikal",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "cikal",
  S3_ACCESS_KEY_FILE: "/run/secrets/s3_access_key",
  S3_SECRET_KEY_FILE: "/run/secrets/s3_secret_key",
  MONITORING_TOKEN_FILE: "/run/secrets/monitoring_token",
};

describe("envSchema ALLOW_SIMULATION_ADAPTERS", () => {
  it("allows simulation adapters outside production (technical-specs 11 §11.2)", () => {
    const env = envSchema.parse({ ...BASE_ENV, APP_ENV: "sit", ALLOW_SIMULATION_ADAPTERS: "true" });

    expect(env.ALLOW_SIMULATION_ADAPTERS).toBe(true);
  });

  it("refuses simulation adapters in production (IN-03)", () => {
    const result = envSchema.safeParse({ ...BASE_ENV, APP_ENV: "production", ALLOW_SIMULATION_ADAPTERS: "true" });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["ALLOW_SIMULATION_ADAPTERS"], message: "must not be true in production" }),
    ]);
  });

  it("defaults to false", () => {
    expect(envSchema.parse({ ...BASE_ENV, APP_ENV: "production" }).ALLOW_SIMULATION_ADAPTERS).toBe(false);
  });
});
