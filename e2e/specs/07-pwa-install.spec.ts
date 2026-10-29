import { test, expect } from "../fixtures/test";
import {
  expectedBrowser,
  expectedOs,
  mockInstallPrompt,
  triggerInstallPrompt,
  wasInstallPromptCalled,
} from "../fixtures/device";
import { callRpc, createOnboardingAccount } from "../helpers/rpc";

async function openInstallDialog(page: import("@playwright/test").Page) {
  await page.goto("/ajustes");
  await page.getByRole("button", { name: /Instalar aplicación/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Instalación PWA", () => {
  test("iOS muestra las instrucciones de Safari o Chrome según el navegador", async ({
    page,
    account,
  }, testInfo) => {
    const os = expectedOs(testInfo.project.name);
    test.skip(os !== "ios", "Solo iPhone/iPad tienen instrucciones manuales");
    void account;

    const browser = expectedBrowser(testInfo.project.name);
    const dialog = await openInstallDialog(page);

    if (browser === "chrome-ios") {
      await expect(
        dialog.getByRole("heading", { name: /Chrome en iPhone/i })
      ).toBeVisible();
      await expect(
        dialog.getByText(/Agregar a inicio/i).first()
      ).toBeVisible();
    } else {
      await expect(
        dialog.getByRole("heading", { name: /Safari en iPhone/i })
      ).toBeVisible();
      await expect(
        dialog.getByText(/Toca Compartir \(cuadrado con flecha hacia arriba\)/i)
      ).toBeVisible();
    }
  });

  test("iPad muestra las instrucciones de Safari en iPad", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      expectedOs(testInfo.project.name) !== "ipados",
      "Solo iPad tiene instrucciones de Safari en iPad"
    );
    void account;

    const dialog = await openInstallDialog(page);
    await expect(
      dialog.getByRole("heading", { name: /Safari en iPad/i })
    ).toBeVisible();
    await expect(
      dialog.getByText(/barra superior derecha de Safari/i)
    ).toBeVisible();
  });

  test("Android usa el prompt nativo cuando el navegador lo ofrece", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      expectedOs(testInfo.project.name) !== "android",
      "El prompt nativo aplica a Chrome Android"
    );
    await mockInstallPrompt(page);
    void account;

    await page.goto("/ajustes");
    await triggerInstallPrompt(page);
    await page.getByRole("button", { name: /Instalar aplicación/i }).click();

    await expect
      .poll(() => wasInstallPromptCalled(page))
      .toBe(true);
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("Android sin prompt nativo muestra instrucciones manuales", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      expectedOs(testInfo.project.name) !== "android",
      "Solo Android muestra las instrucciones de Chrome"
    );
    void account;

    const dialog = await openInstallDialog(page);
    await expect(
      dialog.getByRole("heading", { name: /Chrome en Android/i })
    ).toBeVisible();
    await expect(
      dialog.getByText(/Toca el menú de tres puntos/i)
    ).toBeVisible();
  });

  test("el onboarding instala la PWA sin volver a pedir el tutorial", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      expectedOs(testInfo.project.name) !== "android",
      "El prompt nativo aplica a Chrome Android"
    );

    await mockInstallPrompt(page);
    await createOnboardingAccount(request, testInfo.project.name);
    await callRpc(request, "onboarding.saveProgress", { currentStep: 6 });

    const { cookies } = await request.storageState();
    await page.context().addCookies(cookies);

    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /Instala Grimorio en tu dispositivo/i })
    ).toBeVisible();

    await triggerInstallPrompt(page);
    await page.getByRole("button", { name: /^Instalar aplicación$/i }).click();

    // El prompt nativo se abre después de completar la cuenta, de modo que la
    // app instalada encuentre el onboarding finalizado.
    await expect
      .poll(() => wasInstallPromptCalled(page))
      .toBe(true);
    await expect(
      page.getByRole("button", { name: /Entrar a mi mesa de tarot/i })
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Entrar a mi mesa de tarot/i })
      .click();
    await expect(page).toHaveURL("/");
  });
});
