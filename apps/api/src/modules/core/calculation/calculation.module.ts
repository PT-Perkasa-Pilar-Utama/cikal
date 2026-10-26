import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/index.js";
import { CalculationApi } from "./application/calculation-api.js";
import { ListFormulaVariablesUseCase } from "./application/list-formula-variables.use-case.js";
import { SimulateInstallmentUseCase } from "./application/simulate-installment.use-case.js";
import { FormulaExecutionLogsRepository } from "./db/formula-execution-logs.repository.js";
import { CalculationsController } from "./http/calculations.controller.js";
import { FormulaVariablesController } from "./http/formula-variables.controller.js";

/** Calculation: mesin rumus dan jadwal angsuran (technical-specs 05 §5.16). */
@Module({
  imports: [TenancyModule],
  controllers: [CalculationsController, FormulaVariablesController],
  providers: [FormulaExecutionLogsRepository, CalculationApi, SimulateInstallmentUseCase, ListFormulaVariablesUseCase],
  exports: [CalculationApi],
})
export class CalculationModule {}
