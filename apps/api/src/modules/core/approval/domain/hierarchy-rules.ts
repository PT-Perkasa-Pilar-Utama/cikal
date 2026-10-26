import type { ApprovalHierarchyData } from "@cikal/contracts";

/** Kolom tampilan `newData` yang tidak disimpan di tabel hierarki. */
type DisplayFields = "branchCode" | "productCode" | "levelDescription" | "approverUsername";

/** Isi baris hierarki dari `newData` ChangeRequest, tanpa kolom tampilan. */
export function hierarchyFieldsOf(data: ApprovalHierarchyData): Omit<ApprovalHierarchyData, DisplayFields> {
  const { branchId, productId, jobLevel, subLevel, approverUserId, upLevel, upSubLevel, isActive } = data;
  return { branchId, productId, jobLevel, subLevel, approverUserId, upLevel, upSubLevel, isActive };
}

/** Nama baris "Pending Approval Setup", contoh "011 KPR Level 2.1 - rina.approver". */
export function hierarchyDisplayName(data: ApprovalHierarchyData): string {
  return `${data.branchCode} ${data.productCode} Level ${data.jobLevel}.${data.subLevel} - ${data.approverUsername}`;
}

export interface HierarchySortKey {
  branchCode: string;
  productCode: string;
  jobLevel: number;
  subLevel: number;
}

/** Urutan halaman "Approval Hierarchy": kolom `sort` lebih dulu, lalu cabang, produk, level, dan sub level. */
export function compareHierarchies(
  sort: "branchCode" | "jobLevel",
  direction: "asc" | "desc",
): (a: HierarchySortKey, b: HierarchySortKey) => number {
  const sign = direction === "asc" ? 1 : -1;
  return (a, b) => {
    const primary = sort === "branchCode" ? a.branchCode.localeCompare(b.branchCode) : a.jobLevel - b.jobLevel;
    return (
      sign * primary ||
      a.branchCode.localeCompare(b.branchCode) ||
      a.productCode.localeCompare(b.productCode) ||
      a.jobLevel - b.jobLevel ||
      a.subLevel - b.subLevel
    );
  };
}
