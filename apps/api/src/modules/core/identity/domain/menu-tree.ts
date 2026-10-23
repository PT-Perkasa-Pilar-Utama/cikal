import type { Action, SessionMenu } from "@cikal/contracts";
import type { AccessFlags } from "./access-policy.js";

export interface MenuRow {
  id: string;
  menuCode: string;
  menuName: string;
  menuIndex: number;
  parentMenuId: string | null;
  link: string | null;
  iconName: string | null;
  moduleCode: string;
}

export interface MenuGrant extends AccessFlags {
  menuId: string;
}

const ACTION_FLAGS: [Action, keyof AccessFlags][] = [
  ["VIEW", "canView"],
  ["CREATE", "canCreate"],
  ["UPDATE", "canUpdate"],
  ["DELETE", "canDelete"],
  ["APPROVE", "canApprove"],
];

/** Grup sidebar tidak punya hak sendiri; grup tampil dengan aksi View bila ada submenu yang tampil. */
const GROUP_ACTIONS: Action[] = ["VIEW"];

/**
 * Pohon menu sesi: hanya menu aktif dari modul berlisensi yang punya hak View efektif hari ini
 * (api-specs 02 §2.4 langkah 3, AC-09.02, AC-100.01). `menus` hanya berisi menu aktif.
 */
export function buildMenuTree(
  menus: MenuRow[],
  grants: MenuGrant[],
  licensedModules: ReadonlySet<string>,
): SessionMenu[] {
  const actionsOf = (menuId: string): Action[] => {
    const mine = grants.filter((grant) => grant.menuId === menuId);
    const has = (flag: keyof AccessFlags) => mine.some((grant) => grant[flag]);
    return has("canView") ? ACTION_FLAGS.filter(([, flag]) => has(flag)).map(([action]) => action) : [];
  };
  const byIndex = (a: MenuRow, b: MenuRow) => a.menuIndex - b.menuIndex;
  const node = (menu: MenuRow, actions: Action[], children: SessionMenu[]): SessionMenu => ({
    menuCode: menu.menuCode,
    menuName: menu.menuName,
    link: menu.link,
    iconName: menu.iconName,
    actions,
    children,
  });

  const visible = (menu: MenuRow) => licensedModules.has(menu.moduleCode);
  return menus
    .filter((menu) => menu.parentMenuId === null && visible(menu))
    .sort(byIndex)
    .flatMap((group) => {
      const children = menus
        .filter((menu) => menu.parentMenuId === group.id && visible(menu))
        .sort(byIndex)
        .flatMap((child) => {
          const actions = actionsOf(child.id);
          return actions.length > 0 ? [node(child, actions, [])] : [];
        });
      return children.length > 0 ? [node(group, GROUP_ACTIONS, children)] : [];
    });
}
