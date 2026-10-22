import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { describe, expect, it } from "vitest";
import type { IdempotencyKeysRepository } from "../db/idempotency-keys.repository.js";
import type { TenantTx } from "../db/tenant-tx.js";
import { DomainError } from "./domain-error.js";
import { IdempotencyInterceptor, IdempotencyRequired } from "./idempotency.interceptor.js";

class Operations {
  @IdempotencyRequired()
  submit(): void {}

  optional(): void {}
}

const auth = { sessionId: "s", tenantId: "t", userId: "u", mustChangePassword: false };
const contextFor = (handler: keyof Operations, request: object) =>
  ({
    getHandler: () => Operations.prototype[handler],
    getClass: () => Operations,
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
  }) as unknown as ExecutionContext;
const next: CallHandler = { handle: () => of("handled") };

// Jalur yang diuji berhenti sebelum database, jadi transaksi dan repository tidak pernah dipanggil.
const interceptor = new IdempotencyInterceptor(new Reflector(), {} as TenantTx, {} as IdempotencyKeysRepository);

describe("IdempotencyInterceptor (api-specs 01 §1.7)", () => {
  it("rejects a mandatory operation without the header with IDEMPOTENCY_KEY_REQUIRED", () => {
    const run = () => interceptor.intercept(contextFor("submit", { method: "POST", headers: {}, auth }), next);
    expect(run).toThrowError(DomainError);
    expect(run).toThrowError("Idempotency-Key header is required");
  });

  it("passes an optional operation without the header straight to the handler", () => {
    const result = interceptor.intercept(contextFor("optional", { method: "POST", headers: {}, auth }), next);
    let value: unknown;
    result.subscribe((v) => {
      value = v;
    });
    expect(value).toBe("handled");
  });
});
