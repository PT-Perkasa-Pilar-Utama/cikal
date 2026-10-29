import type { SessionMenu } from "@cikal/contracts";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { menuGroupIcon } from "./menu-icons";

/**
 * Rute SPA per kode menu. Rute dimiliki frontend dan diperiksa tipe router, jadi `link` dari server tidak dipakai
 * sebagai tujuan navigasi. Menu tanpa rute di sini belum punya layar dan tidak ditampilkan.
 */
const menuRoutes = new Map<string, LinkProps["to"]>([
  ["APP-ENTRY", "/applications/drafts"],
  ["APP-INQUIRY", "/applications"],
  ["APP-SIMULATION", "/applications/simulation"],
  ["MST-PRODUCT", "/master/products"],
  ["MST-ROUTE", "/master/routes"],
  ["MST-CHECKLIST", "/master/checklists"],
  ["MST-SCORING", "/master/scoring"],
  ["MST-DECISION", "/master/decision"],
  ["MST-APPROVAL", "/master/approvals"],
  ["IAM-ROLE-ACCESS", "/access/role-access"],
  ["OPS-VERIFICATION", "/operations/verification"],
  ["OPS-APPROVAL", "/operations/approval"],
  ["OPS-MONITORING", "/operations/monitoring"],
  ["RPT-AUDIT", "/reports/audit-trail"],
]);

/** Submenu yang sudah punya layar; grup tanpa submenu seperti itu disembunyikan. */
function routableChildren(group: SessionMenu): { menu: SessionMenu; to: LinkProps["to"] }[] {
  return group.children.flatMap((menu) => {
    const to = menuRoutes.get(menu.menuCode);
    return to ? [{ menu, to }] : [];
  });
}

function MenuGroup({ group }: { group: SessionMenu }) {
  const [open, setOpen] = useState(true);
  const children = routableChildren(group);
  if (children.length === 0) return null;
  const Icon = menuGroupIcon(group.iconName);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-neutral-7 hover:bg-neutral-1"
      >
        <Icon size={16} aria-hidden />
        <span className="flex-1 text-left">{group.menuName}</span>
        <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {children.map(({ menu, to }) => (
            <li key={menu.menuCode}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-lg py-2 pr-3 pl-9 text-neutral-6 hover:bg-neutral-1"
                activeProps={{ className: "bg-primary-light font-semibold text-primary hover:bg-primary-light" }}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {menu.menuName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Sidebar LayoutSide: blok logo Primary dan grup menu dari hak akses sesi (design-system 6.1, AC-09.02). */
export function Sidebar({ menus }: { menus: SessionMenu[] }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-2 bg-neutral-0">
      <div className="flex h-16 items-center bg-primary px-6 text-lg font-bold tracking-wide text-neutral-0">Cikal</div>
      <nav aria-label="Main menu" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {menus.map((group) => (
            <MenuGroup key={group.menuCode} group={group} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
