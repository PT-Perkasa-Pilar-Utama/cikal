import { type InstallmentSimulationResponse, installmentSimulationRequestSchema } from "@cikal/contracts";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { SimulateInstallmentUseCase } from "../application/simulate-installment.use-case.js";

class InstallmentSimulationDto extends createZodDto(installmentSimulationRequestSchema) {}

/** Simulasi angsuran (api-specs 09 §9.1); operasi baca, jadi cukup VIEW. */
@Controller("v1/calculations")
export class CalculationsController {
  constructor(private readonly simulate: SimulateInstallmentUseCase) {}

  @Post("installment-simulation")
  @HttpCode(200)
  @Requires("APP-SIMULATION", "VIEW")
  installmentSimulation(
    @CurrentContext() ctx: RequestContext,
    @Body() body: InstallmentSimulationDto,
  ): Promise<InstallmentSimulationResponse> {
    return this.simulate.execute(ctx, body);
  }
}
