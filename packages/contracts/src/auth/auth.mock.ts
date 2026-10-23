import type { LoginResponse, SessionResponse } from "./auth.schema.js";

export const loginResponseMock = {
  data: {
    user: {
      id: "0192b6a0-7c1e-7b3a-9f41-2d6c1e0a9b11",
      username: "maker.01",
      fullName: "Andi Pratama",
      roleName: "Maker",
    },
    company: { companyCode: "001", companyName: "Bank Contoh" },
    mustChangePassword: false,
  },
} satisfies LoginResponse;

export const sessionResponseMock = {
  data: {
    user: { ...loginResponseMock.data.user, branchCode: "011" },
    company: { ...loginResponseMock.data.company, platformCode: "01" },
    mustChangePassword: false,
    license: {
      status: "ACTIVE",
      validTo: "2027-12-31",
      modules: ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"],
    },
    menus: [
      {
        menuCode: "MST",
        menuName: "Master Data",
        link: null,
        iconName: "database",
        actions: ["VIEW"],
        children: [
          {
            menuCode: "MST-PRODUCT",
            menuName: "Product",
            link: "/master/products",
            iconName: "package",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
            children: [],
          },
          {
            menuCode: "MST-ROUTE",
            menuName: "Product Route",
            link: "/master/routes",
            iconName: "route",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
            children: [],
          },
          {
            menuCode: "MST-CHECKLIST",
            menuName: "Document Checklist",
            link: "/master/checklists",
            iconName: "list-checks",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
            children: [],
          },
        ],
      },
      {
        menuCode: "IAM",
        menuName: "Access Control",
        link: null,
        iconName: "shield",
        actions: ["VIEW"],
        children: [
          {
            menuCode: "IAM-ROLE-ACCESS",
            menuName: "Role Access",
            link: "/access/role-access",
            iconName: "key",
            actions: ["VIEW", "CREATE", "UPDATE"],
            children: [],
          },
        ],
      },
    ],
    sessionExpiresAt: "2026-10-22T20:00:00Z",
    idleTimeoutMinutes: 30,
  },
} satisfies SessionResponse;
