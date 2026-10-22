import type { MenuTreeResponse, RoleAccessListResponse, RoleListResponse } from "./access-control.schema.js";

export const roleListResponseMock = {
  data: [
    { id: "0192b6a1-0001-7000-8000-000000000001", roleName: "Maker", isActive: true },
    { id: "0192b6a1-0002-7000-8000-000000000002", roleName: "Checker", isActive: true },
    { id: "0192b6a1-0003-7000-8000-000000000003", roleName: "Sales", isActive: true },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
} satisfies RoleListResponse;

export const menuTreeResponseMock = {
  data: [
    {
      id: "0192b6a2-0001-7000-8000-000000000001",
      menuCode: "MST",
      menuName: "Master Data",
      menuIndex: 3,
      link: null,
      moduleCode: "CORE",
      children: [
        {
          id: "0192b6a2-0002-7000-8000-000000000002",
          menuCode: "MST-PRODUCT",
          menuName: "Product",
          menuIndex: 1,
          link: "/master/products",
          moduleCode: "CORE",
          children: [],
        },
      ],
    },
  ],
} satisfies MenuTreeResponse;

export const roleAccessListResponseMock = {
  data: [
    {
      id: "0192b6a3-0001-7000-8000-000000000001",
      role: { id: "0192b6a1-0002-7000-8000-000000000002", roleName: "Checker" },
      menu: {
        id: "0192b6a2-0002-7000-8000-000000000002",
        menuCode: "MST-PRODUCT",
        menuName: "Product",
        parentMenuName: "Master Data",
      },
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canApprove: true,
      hasPendingChange: false,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies RoleAccessListResponse;
