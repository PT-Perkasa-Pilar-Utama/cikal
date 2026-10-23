import { type MonitoringStatus, monitoringStatusSchema } from "@cikal/contracts";
import type { SelectOption } from "../../components/ui/SelectField";

/** Label status langkah (api-specs 13 §13.1); nama antrean Waiting belum ada di respons §13.3. */
export const STATUS_LABELS: Record<MonitoringStatus, string> = {
  ERROR: "Error",
  WAITING_HUMAN: "Waiting",
  WAITING_EXTERNAL: "Waiting for provider",
  RUNNING: "Running",
};

/** Warna tag per status dari palet semantic (design-system 2.3, 7.5 Tag). */
export const STATUS_TAG_CLASSES: Record<MonitoringStatus, string> = {
  ERROR: "bg-error-lightest text-error",
  WAITING_HUMAN: "bg-warning-lightest text-neutral-9",
  WAITING_EXTERNAL: "bg-warning-lightest text-neutral-9",
  RUNNING: "bg-primary-light text-primary",
};

export const STATUS_OPTIONS: readonly SelectOption[] = monitoringStatusSchema.options.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

/** Nilai filter "Status"; pilihan kosong berarti semua status. */
export function parseStatusFilter(value: string): MonitoringStatus | undefined {
  const parsed = monitoringStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Nama debitur dan kode cabang masih `null` sampai kartu BE-S3-01 dan TL-S5-04. */
export const orDash = (value: string | null): string => value ?? "-";
