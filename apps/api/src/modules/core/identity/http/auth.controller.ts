import { type LoginResponse, loginRequestSchema, type SessionResponse } from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createZodDto } from "nestjs-zod";
import { APP_CONFIG, type AppConfig } from "../../../../platform/config/config.js";
import { AllowDuringPasswordChange, Authenticated, Public } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { CSRF_HEADER, SESSION_COOKIE } from "../../../../platform/http/session-token.js";
import { GetSessionUseCase } from "../application/get-session.use-case.js";
import { LoginUseCase } from "../application/login.use-case.js";
import { LogoutUseCase } from "../application/logout.use-case.js";
import { clearSessionCookies, setSessionCookies } from "./session-cookies.js";

class LoginDto extends createZodDto(loginRequestSchema) {}

/** Login, logout, dan sesi kanal web (api-specs 02 §2.2 s.d. §2.4). */
@Controller("v1/auth")
export class AuthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly logins: LoginUseCase,
    private readonly logouts: LogoutUseCase,
    private readonly sessions: GetSessionUseCase,
  ) {}

  /** Rate limit 10 request per menit per IP lewat `ThrottlerGuard` (technical-specs 07 §7.5). */
  @Post("login")
  @HttpCode(200)
  @Public()
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() body: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    const result = await this.logins.execute(body, request.ip);
    setSessionCookies(reply, result, this.config.sessionCookieSecure);
    return result.response;
  }

  /** Publik agar logout idempoten: cookie tanpa sesi tetap dijawab 204. */
  @Post("logout")
  @HttpCode(204)
  @Public()
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.logouts.execute(request.cookies[SESSION_COOKIE], request.headers[CSRF_HEADER]);
    clearSessionCookies(reply, this.config.sessionCookieSecure);
  }

  @Get("session")
  @Authenticated()
  @AllowDuringPasswordChange()
  session(@CurrentContext() ctx: RequestContext): Promise<SessionResponse> {
    return this.sessions.execute(ctx);
  }
}
