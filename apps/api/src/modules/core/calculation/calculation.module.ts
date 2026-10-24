import { Module } from "@nestjs/common";
import { CalculationApi } from "./application/calculation-api.js";
import { SimulateInstallmentUseCase } from "./application/simulate-installment.use-case.js";
import { FormulaExecutionLogsRepository } from "./db/formula-execution-logs.repository.js";
import { CalculationsController } from "./http/calculations.controller.js";

/** Calculation: mesin rumus dan jadwal angsuran (technical-specs 05 §5.16). */
@Module({
  controllers: [CalculationsController],
  providers: [FormulaExecutionLogsRepository, CalculationApi, SimulateInstallmentUseCase],
  exports: [CalculationApi],
})
export class CalculationModule {}
