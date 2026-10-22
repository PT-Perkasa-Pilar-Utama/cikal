import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { RequestContext } from "./access-port.js";
import { DomainError } from "./domain-error.js";

/** Konteks request terautentikasi yang dipasang `AccessGuard`; hanya untuk rute ber-sesi. */
export const CurrentContext = createParamDecorator((_data: unknown, context: ExecutionContext): RequestContext => {
  const auth = context.switchToHttp().getRequest<FastifyRequest>().auth;
  if (!auth) throw DomainError.standard("UNAUTHENTICATED");
  return auth;
});
