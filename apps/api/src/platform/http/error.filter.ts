import { randomUUID } from "node:crypto";
import { type ErrorEnvelope, standardErrors } from "@cikal/contracts";
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodValidationException } from "nestjs-zod";
import { ZodError } from "zod";
import { DomainError } from "./domain-error.js";

const statusToCode: Record<number, keyof typeof standardErrors> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "ACCESS_DENIED",
  404: "NOT_FOUND",
  409: "INVALID_STATE",
  413: "FILE_TOO_LARGE",
  415: "UNSUPPORTED_FILE_TYPE",
  429: "RATE_LIMITED",
  501: "NOT_IMPLEMENTED",
  503: "SERVICE_UNAVAILABLE",
};

/** Satu tempat yang mengubah semua error menjadi envelope API-04 (api-specs 01 §1.5). */
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const header = request.headers["x-correlation-id"];
    const correlationId = typeof header === "string" && header.length > 0 ? header : randomUUID();

    const [status, body] = this.toEnvelope(exception, correlationId);
    if (status >= 500) {
      this.logger.error({ correlationId, err: exception }, "Unhandled error");
    }
    void reply.status(status).header("x-correlation-id", correlationId).send(body);
  }

  private toEnvelope(exception: unknown, correlationId: string): [number, ErrorEnvelope] {
    if (exception instanceof DomainError) {
      return [
        exception.status,
        { code: exception.code, message: exception.message, details: exception.details, correlationId },
      ];
    }
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const issues = zodError instanceof ZodError ? zodError.issues : [];
      return [
        400,
        {
          code: "VALIDATION_FAILED",
          message: standardErrors.VALIDATION_FAILED.message,
          details: issues.map((issue) => ({ field: issue.path.join("."), code: issue.code, message: issue.message })),
          correlationId,
        },
      ];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = statusToCode[status] ?? "INTERNAL_ERROR";
      return [status, { code, message: standardErrors[code].message, details: [], correlationId }];
    }
    return [
      500,
      { code: "INTERNAL_ERROR", message: standardErrors.INTERNAL_ERROR.message, details: [], correlationId },
    ];
  }
}
