import { type BrowserContext, test as base, type Page } from "@playwright/test";
import { authFile, BASE_URL, type SessionUser } from "./seed-users";

/** `pageAs(user)` membuka halaman baru dengan sesi user seed dari global setup, satu context per user. */
export const test = base.extend<{ pageAs: (username: SessionUser) => Promise<Page> }>({
  pageAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (username) => {
      const context = await browser.newContext({ baseURL: BASE_URL, storageState: authFile(username) });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect } from "@playwright/test";
