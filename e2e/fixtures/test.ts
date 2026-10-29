import { expect, test as base } from "@playwright/test";
import {
  createIsolatedAccount,
  type TestAccount,
} from "../helpers/rpc";

type Fixtures = {
  account: TestAccount;
};

/**
 * Base de todos los specs:
 * - `account`: usuario único por test (registro + onboarding por RPC) y su
 *   cookie inyectada en el contexto del navegador. Evita mutar el usuario demo.
 * - Override de `page`: aplica el `maxTouchPoints` que un iPadOS real reporta
 *   para el proyecto `ipados-real-ua`.
 */
export const test = base.extend<Fixtures>({
  page: async ({ page }, use, testInfo) => {
    if (testInfo.project.name === "ipados-real-ua") {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "maxTouchPoints", {
          configurable: true,
          get: () => 5,
        });
      });
    }

    await use(page);
  },

  account: async ({ page, request }, use, testInfo) => {
    const account = await createIsolatedAccount(request, testInfo.project.name);
    const { cookies } = await request.storageState();
    await page.context().addCookies(cookies);
    await use(account);
  },
});

export { expect };

/** Entra al espacio de demostración. Solo para tests de lectura. */
export async function openDemoWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/acceso");
  await page.getByRole("button", { name: /Abrir demostración/i }).click();
  await expect(page).toHaveURL("/");
}
