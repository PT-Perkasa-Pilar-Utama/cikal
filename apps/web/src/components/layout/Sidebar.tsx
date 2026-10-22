import type { SessionMenu } from "@cikal/contracts";
import { Link, type LinkProps } from "@tanstack/react-router";

/** Menu dari hak akses sesi; menu tanpa hak View tidak pernah dikirim server (AC-09.02). */
export function Sidebar({ menus }: { menus: SessionMenu[] }) {
  return (
    <nav aria-label="Main menu" className="w-60 shrink-0 bg-primary p-4 text-neutral-0">
      <div className="mb-6 text-lg font-bold">Cikal</div>
      <ul className="space-y-4">
        {menus.map((group) => (
          <li key={group.menuCode}>
            <div className="mb-1 text-xs uppercase tracking-wide text-primary-light">{group.menuName}</div>
            <ul className="space-y-1">
              {group.children.map((menu) =>
                menu.link ? (
                  <li key={menu.menuCode}>
                    <Link to={menu.link as LinkProps["to"]} className="block rounded px-2 py-1 hover:bg-neutral-0/10">
                      {menu.menuName}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
