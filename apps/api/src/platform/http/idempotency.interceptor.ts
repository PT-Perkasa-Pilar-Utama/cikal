import { createHash } from "node:crypto";
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, SetMetadata } from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants.js";
import { Reflector } from "@nestjs/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { catchError, defer, from, mergeMap, type Observable, of, throwError } from "rxjs";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { IdempotencyKeysRepository } from "../db/idempotency-keys.repository.js";
import { TenantTx } from "../db/tenant-tx.js";
import type { RequestContext } from "./access-port.js";
import { DomainError } from "./domain-error.js";

export const IDEMPOTENCY_REQUIRED = "cikal:idempotency-required";
const KEY_HEADER = "idempotency-key";
const REPLAYED_HEADER = "Idempotent-Replayed";
/** Kunci disimpan 24 jam per user (api-specs 01 §1.7). */
const KEY_TTL_MS = 24 * 60 * 60 * 1000;
const MUTATING_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH"]);
const keySchema = z.uuid();

/** Operasi bertanda **Idempotency: wajib** di api-specs; tanpa header dijawab `400 IDEMPOTENCY_KEY_REQUIRED`. */
export const IdempotencyRequired = () => SetMetadata(IDEMPOTENCY_REQUIRED, true);

function requestHash(request: FastifyRequest): Buffer {
  return createHash("sha256")
    .update(`${request.method} ${request.url}\n${JSON.stringify(request.body ?? null)}`)
    .digest();
}

/**
 * `Idempotency-Key` pada POST, PUT, PATCH terautentikasi (api-specs 01 §1.7): ulangan dengan body sama mendapat
 * status dan body pertama, body beda `409 IDEMPOTENCY_KEY_REUSED`, ulangan saat permintaan pertama masih
 * diproses `409 ALREADY_PROCESSED`. Respons gagal tidak disimpan.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: TenantTx,
    private readonly keys: IdempotencyKeysRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const auth = request.auth;
    if (!auth || !MUTATING_METHODS.has(request.method)) return next.handle();

    const header = request.headers[KEY_HEADER];
    if (header === undefined) {
      const required = this.reflector.getAllAndOverride<boolean | undefined>(IDEMPOTENCY_REQUIRED, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (required) throw DomainError.standard("IDEMPOTENCY_KEY_REQUIRED");
      return next.handle();
    }
    const key = keySchema.safeParse(header);
    if (!key.success) {
      throw DomainError.standard("VALIDATION_FAILED", undefined, [
        { field: "Idempotency-Key", code: "invalid_format", message: "Idempotency-Key must be a UUID" },
      ]);
    }

    // Status sukses dari `@HttpCode`, atau bawaan Nest (201 untuk POST), karena reply belum diberi status di sini.
    const status =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) ??
      (request.method === "POST" ? 201 : 200);
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    return defer(() => this.claim(auth, key.data, requestHash(request))).pipe(
      mergeMap((claim) => {
        if (claim.kind === "replay") {
          void reply.status(claim.status).header(REPLAYED_HEADER, "true");
          return of(claim.body);
        }
        return next.handle().pipe(
          mergeMap((body) =>
            from(this.db.withTenantTx(auth, (tx) => this.keys.complete(tx, claim.id, { status, body }))).pipe(
              mergeMap(() => of(body)),
            ),
          ),
          catchError((error: unknown) =>
            from(this.db.withTenantTx(auth, (tx) => this.keys.release(tx, claim.id))).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }

  private claim(
    auth: RequestContext,
    idempotencyKey: string,
    hash: Buffer,
  ): Promise<{ kind: "fresh"; id: string } | { kind: "replay"; status: number; body: unknown }> {
    const now = new Date();
    const id = uuidv7();
    return this.db.withTenantTx(auth, async (tx) => {
      const result = await this.keys.claim(
        tx,
        {
          id,
          tenantId: auth.tenantId,
          userId: auth.userId,
          idempotencyKey,
          requestHash: hash,
          expiresAt: new Date(now.getTime() + KEY_TTL_MS),
        },
        now,
      );
      if (result.kind === "claimed") return { kind: "fresh", id };
      if (!result.requestHash.equals(hash)) {
        throw DomainError.standard("IDEMPOTENCY_KEY_REUSED");
      }
      if (!result.response) throw DomainError.standard("ALREADY_PROCESSED");
      return { kind: "replay", ...result.response };
    });
  }
}
