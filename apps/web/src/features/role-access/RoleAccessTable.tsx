import type { RoleAccessListResponse } from "@cikal/contracts";
import { Check, Minus } from "lucide-react";
import { ACCESS_FLAGS } from "./labels";

type RoleAccessRow = RoleAccessListResponse["data"][number];

/** Menu induk di kolom "Menu" dan sub menu di kolom "Sub Menu"; menu tanpa induk tidak punya sub menu. */
function menuColumns(menu: RoleAccessRow["menu"]): [string, string] {
  return menu.parentMenuName === null ? [menu.menuName, "-"] : [menu.parentMenuName, menu.menuName];
}

/** Tabel halaman "Role Access": satu baris per role dan menu dengan lima aksi (api-specs 03 §3.3; design-system 8.3). */
export function RoleAccessTable({ rows }: { rows: RoleAccessRow[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Role</th>
          <th className="p-3">Menu</th>
          <th className="p-3">Sub Menu</th>
          {ACCESS_FLAGS.map(({ label }) => (
            <th key={label} className="p-3 text-center">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const [menu, subMenu] = menuColumns(row.menu);
          return (
            <tr key={row.id} className="border-b border-neutral-2 last:border-0">
              <td className="p-3 font-semibold text-neutral-8">{row.role.roleName}</td>
              <td className="p-3">{menu}</td>
              <td className="p-3">{subMenu}</td>
              {ACCESS_FLAGS.map(({ flag, label }) => (
                <td key={flag} className="p-3 text-center">
                  {row[flag] ? (
                    <Check size={16} aria-label={`${label} granted`} className="inline text-success" />
                  ) : (
                    <Minus size={16} aria-label={`${label} not granted`} className="inline text-neutral-4" />
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
