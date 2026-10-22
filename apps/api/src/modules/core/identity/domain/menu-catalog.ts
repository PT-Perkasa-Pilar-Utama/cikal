import type { MenuNode } from "@cikal/contracts";
import type { MenuRow } from "./menu-tree.js";

/**
 * Pohon semua menu untuk dropdown "Menu" dan "Sub Menu" di Role Access (api-specs 03 §3.2), tanpa melihat hak
 * user. Menu modul tak berlisensi tidak dikembalikan (LC-04), begitu juga anak dari menu yang tersembunyi.
 */
export function buildMenuCatalog(menus: readonly MenuRow[], licensedModules: readonly string[]): MenuNode[] {
  const childrenOf = (parentId: string | null): MenuNode[] =>
    menus
      .filter((menu) => menu.parentMenuId === parentId && licensedModules.includes(menu.moduleCode))
      .sort((a, b) => a.menuIndex - b.menuIndex)
      .map((menu) => ({
        id: menu.id,
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        menuIndex: menu.menuIndex,
        link: menu.link,
        moduleCode: menu.moduleCode,
        children: childrenOf(menu.id),
      }));
  return childrenOf(null);
}
