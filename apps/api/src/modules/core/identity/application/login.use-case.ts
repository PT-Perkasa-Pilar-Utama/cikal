import { randomBytes } from "node:crypto";
import type { LoginRequest, LoginResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { bindTenant, TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { hashToken } from "../../../../platform/http/session-token.js";
import { AuditTrail } from "../../audit/index.js";
import { CompanyDirectory } from "../../tenancy/index.js";
import { LoginAttemptsRepository } from "../db/login-attempts.repository.js";
import { SessionsRepository } from "../db/sessions.repository.js";
import { UsersRepository } from "../db/users.repository.js";
import {
  AUTHENTICATION_AUDIT_MODULE,
  afterWrongPassword,
  isLocked,
  LOGIN_REJECTIONS,
  type LoginAccount,
  type LoginRejection,
  rejectionForStatus,
} from "../domain/login-policy.js";
import { sessionExpiry } from "../domain/session-policy.js";
import { PasswordHasher } from "./password-hasher.js";

/** Nilai cookie sesi acak 256 bit (api-specs 02 §2.1). */
const TOKEN_BYTES = 32;

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  response: LoginResponse;
}

type Outcome = LoginResult | { rejection: LoginRejection };

/**
 * `login(username, password, channel WEB)` (technical-specs 05 §5.1, api-specs 02 §2.2). Kegagalan dicatat dan
 * di-commit lebih dulu, baru dilempar sebagai error, agar hitungan gagal, LoginAttempt, dan audit tidak ikut
 * di-rollback. Audit `LOGIN_FAILED` hanya untuk username terdaftar, karena jejak audit milik satu tenant.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly attempts: LoginAttemptsRepository,
    private readonly companies: CompanyDirectory,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditTrail,
  ) {}

  async execute(request: LoginRequest, ipAddress: string): Promise<LoginResult> {
    const username = request.username.toLowerCase();
    const now = new Date();
    const outcome = await this.db.withLookupTx("app.login_username", username, async (tx): Promise<Outcome> => {
      const fail = async (rejection: LoginRejection, actor?: Actor): Promise<Outcome> => {
        await this.attempts.record(tx, { username, success: false, ipAddress });
        if (actor) {
          await this.audit.record(tx, actor, {
            module: AUTHENTICATION_AUDIT_MODULE,
            action: "LOGIN_FAILED",
            description: rejection,
          });
        }
        return { rejection };
      };

      const user = await this.users.findForLogin(tx, username);
      if (!user) {
        await this.hasher.verify(null, request.password);
        return fail("INVALID_CREDENTIALS");
      }
      const actor: Actor = { tenantId: user.tenantId, userId: user.id, ipAddress };
      await bindTenant(tx, actor);
      const account: LoginAccount = {
        status: user.status,
        hasRole: user.roleId !== null,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
      };
      if (isLocked(account, now)) return fail("ACCOUNT_LOCKED", actor);
      if (!(await this.hasher.verify(user.passwordHash, request.password))) {
        const failure = afterWrongPassword(account, now);
        await this.users.recordFailure(tx, user.id, failure);
        return fail(failure.rejection, actor);
      }
      const rejection = rejectionForStatus(account);
      if (rejection) return fail(rejection, actor);

      const sessionToken = randomBytes(TOKEN_BYTES).toString("base64url");
      const csrfToken = randomBytes(TOKEN_BYTES).toString("base64url");
      const expiresAt = sessionExpiry(now);
      await this.users.recordSuccess(tx, user.id, now);
      await this.sessions.replaceWebSession(
        tx,
        {
          id: uuidv7(),
          tenantId: user.tenantId,
          userId: user.id,
          tokenHash: hashToken(sessionToken),
          csrfTokenHash: hashToken(csrfToken),
          expiresAt,
          ipAddress,
        },
        now,
      );
      await this.attempts.record(tx, { username, success: true, ipAddress });
      await this.audit.record(tx, actor, { module: AUTHENTICATION_AUDIT_MODULE, action: "LOGIN" });
      const profile = await this.users.findProfile(tx, user.id);
      if (!profile) throw new Error(`User ${user.id} lost its role during login`);
      const company = await this.companies.summary(tx, user.tenantId);
      return {
        sessionToken,
        csrfToken,
        expiresAt,
        response: {
          data: {
            user: profile,
            company: { companyCode: company.companyCode, companyName: company.companyName },
            mustChangePassword: user.mustChangePassword,
          },
        },
      };
    });

    if ("rejection" in outcome) {
      const { status, message } = LOGIN_REJECTIONS[outcome.rejection];
      throw new DomainError(outcome.rejection, message, status);
    }
    return outcome;
  }
}
