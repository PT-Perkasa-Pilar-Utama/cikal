import type { FieldPresentation } from "../change-request/comparison";

/** "Pending Approval Setup" memakai nama kolom halaman Approval Hierarchy; id diwakili kode dan username. */
export const APPROVAL_HIERARCHY_PRESENTATION: FieldPresentation = {
  labels: {
    branchCode: "Branch",
    productCode: "Product",
    jobLevel: "Job Level",
    subLevel: "Sub Level",
    levelDescription: "Description",
    approverUsername: "Approver",
    upLevel: "Up Level",
    upSubLevel: "Up Sub Level",
    isActive: "Active",
  },
  hidden: ["branchId", "productId", "approverUserId"],
};
