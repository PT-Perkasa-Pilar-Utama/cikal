import { type MenuCode, standardErrors } from "@cikal/contracts";
import type { ReactNode } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useMenuActions } from "./api";

/** Halaman menu tanpa hak View menampilkan pesan `ACCESS_DENIED` alih-alih isinya (AC-09.02 TRM_ACC_001). */
export function MenuGuard({ menuCode, children }: { menuCode: MenuCode; children: ReactNode }) {
  const actions = useMenuActions(menuCode);
  if (!actions.has("VIEW")) {
    return <FeedbackMessage type="error">{standardErrors.ACCESS_DENIED.message}</FeedbackMessage>;
  }
  return children;
}
