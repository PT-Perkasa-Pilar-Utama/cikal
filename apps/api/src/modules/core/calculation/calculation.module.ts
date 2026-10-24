import { Module } from "@nestjs/common";
import { CalculationApi } from "./application/calculation-api.js";
import { FormulaExecutionLogsRepository } from "./db/formula-execution-logs.repository.js";

/** Calculation: mesin rumus dan jadwal angsuran (technical-specs 05 §5.16). */
@Module({
  providers: [FormulaExecutionLogsRepository, CalculationApi],
  exports: [CalculationApi],
})
export class CalculationModule {}
