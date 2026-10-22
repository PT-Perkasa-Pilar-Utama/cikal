import type { ChangeRequestEntityType, MenuCode } from "@cikal/contracts";

/** Menu pemilik hak tiap jenis entity: VIEW untuk melihat, APPROVE untuk meninjau (api-specs 07 §7.1). */
export const ENTITY_MENU: Record<ChangeRequestEntityType, MenuCode> = {
  ROLE_ACCESS: "IAM-ROLE-ACCESS",
  PRODUCT: "MST-PRODUCT",
  PRODUCT_PRICING: "MST-PRODUCT",
  ROUTE: "MST-ROUTE",
  DOCUMENT_CHECKLIST: "MST-CHECKLIST",
  APPROVAL_HIERARCHY: "MST-APPROVAL",
  SCORING_MODEL: "MST-SCORING",
  DECISION_MATRIX: "MST-DECISION",
  DOCUMENT_NUMBER_FORMAT: "MST-NUMBERING",
  INTEGRATION_CONFIG: "MST-INTEGRATION",
};

/** Menu bersama beberapa jenis entity dalam satu halaman Pending; `null` bila menunya berbeda (api-specs 07 §7.2). */
export function sharedMenu(entityTypes: readonly ChangeRequestEntityType[]): MenuCode | null {
  const menus = new Set(entityTypes.map((entityType) => ENTITY_MENU[entityType]));
  const [menu] = menus;
  return menus.size === 1 && menu ? menu : null;
}
