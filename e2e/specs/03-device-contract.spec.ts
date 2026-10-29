import { test, expect } from "../fixtures/test";
import {
  expectNoHorizontalOverflow,
  expectOsAndBrowser,
  isMobileProject,
  mockKeyboard,
  mockStandalone,
  readDocumentState,
  setKeyboardOpen,
} from "../fixtures/device";

test.describe("Contrato de dispositivo @device", () => {
  test("expone data-os y data-browser correctos para el proyecto", async ({
    page,
    account,
  }, testInfo) => {
    void account;
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);

    await expectOsAndBrowser(page, testInfo.project.name);
    await expect(page.locator("html")).toHaveAttribute(
      "data-standalone",
      "false"
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-keyboard",
      /open|closed/
    );
  });

  test("no hay desbordamiento horizontal en las rutas principales", async ({
    page,
    account,
  }) => {
    void account;

    for (const route of ["/", "/lecturas/nueva", "/grimorio", "/ajustes"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("--vvh coincide con el viewport visual", async ({ page, account }) => {
    void account;
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);

    const state = await readDocumentState(page);
    expect(state.vvh).toMatch(/^\d+(\.\d+)?px$/);
    expect(state.visualViewportHeight).not.toBeNull();
    expect(
      Math.abs(parseFloat(state.vvh) - (state.visualViewportHeight ?? 0))
    ).toBeLessThanOrEqual(1);
  });

  test("cabecera y barra inferior respetan el área segura base", async ({
    page,
    account,
  }) => {
    void account;
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);

    const state = await readDocumentState(page);
    expect(parseFloat(state.header?.paddingTop ?? "0")).toBeGreaterThanOrEqual(
      12
    );
    expect(
      parseFloat(state.nav?.paddingBottom ?? "0")
    ).toBeGreaterThanOrEqual(9);
  });

  test("el teclado oculta la barra inferior y se restaura al cerrar", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "Solo aplica a dispositivos táctiles"
    );
    void account;

    await page.goto("/lecturas/nueva");
    const question = page.getByLabel(/Pregunta o tema de la consulta/i);
    await question.click();
    await question.fill("Lectura de prueba E2E");

    await expect(page.locator("html")).toHaveAttribute(
      "data-keyboard",
      "open"
    );
    await expect.poll(async () => (await readDocumentState(page)).nav?.opacity).toBe("0");

    await page.locator("h1").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-keyboard",
      "closed"
    );
    await expect.poll(async () => (await readDocumentState(page)).nav?.opacity).toBe("1");
  });

  test("la simulación de teclado reduce --vvh", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "Solo aplica a dispositivos táctiles"
    );
    await mockKeyboard(page);
    void account;

    await page.goto("/lecturas/nueva");
    await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);

    const before = await readDocumentState(page);
    await setKeyboardOpen(page, true);
    await expect
      .poll(async () => parseFloat((await readDocumentState(page)).vvh))
      .toBeLessThan(parseFloat(before.vvh) - 50);

    await setKeyboardOpen(page, false);
    await expect
      .poll(async () => parseFloat((await readDocumentState(page)).vvh))
      .toBeGreaterThanOrEqual(parseFloat(before.vvh) - 1);
  });

  test("modo standalone: atributo y estado instalado en ajustes", async ({
    page,
    account,
  }) => {
    await mockStandalone(page);
    void account;

    await page.goto("/ajustes");
    await expect(page.locator("html")).toHaveAttribute(
      "data-standalone",
      "true"
    );
    await expect(
      page.getByText(/Aplicación instalada y activa en pantalla completa/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Instalar aplicación/i })
    ).toHaveCount(0);
  });
});
