import { BadgeAlert, BadgeCheck, BadgeInfo, BadgeX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type FeedbackType = "info" | "success" | "warning" | "error";

/** Empat tipe Feedback Message dengan ikonnya; warna dari palet semantic (design-system 2.3, 7.1). */
const FEEDBACK_STYLES: Record<FeedbackType, { icon: LucideIcon; className: string }> = {
  info: { icon: BadgeInfo, className: "border-info-light bg-info-lightest [&>svg]:text-info" },
  success: { icon: BadgeCheck, className: "border-success-light bg-success-lightest [&>svg]:text-success" },
  warning: { icon: BadgeAlert, className: "border-warning-light bg-warning-lightest [&>svg]:text-warning" },
  error: { icon: BadgeX, className: "border-error-light bg-error-lightest [&>svg]:text-error" },
};

/** Pesan umpan balik; teks warning memakai Neutral 9 karena kontras putih di atas Warning rendah (design-system D-04). */
export function FeedbackMessage({ type, children }: { type: FeedbackType; children: ReactNode }) {
  const { icon: Icon, className } = FEEDBACK_STYLES[type];
  return (
    <div
      role={type === "error" || type === "warning" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-neutral-9 ${className}`}
    >
      <Icon size={20} className="shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
