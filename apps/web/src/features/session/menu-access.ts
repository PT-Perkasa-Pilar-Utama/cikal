import type { Action, MenuCode, SessionMenu } from "@cikal/contracts";

const NO_ACTIONS: ReadonlySet<Action> = new Set();

/**
 * Aksi yang diberikan sesi pada satu menu, dicari di seluruh pohon menu. Menu tanpa hak View tidak pernah dikirim
 * server, jadi hasil kosong berarti halaman itu tertutup (api-specs 02 §2.4, AC-09.02).
 */
export function menuActions(menus: SessionMenu[], menuCode: MenuCode): ReadonlySet<Action> {
  for (const menu of menus) {
    if (menu.menuCode === menuCode) return new Set(menu.actions);
    const found = menuActions(menu.children, menuCode);
    if (found.size > 0) return found;
  }
  return NO_ACTIONS;
}
