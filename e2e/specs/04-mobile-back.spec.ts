import { test, expect } from "../fixtures/test";
import { isMobileProject } from "../fixtures/device";

test.describe("Botón atrás del navegador", () => {
  test("en móvil cierra un diálogo sin salir de la página", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "El cierre por atrás aplica a móvil y tablet"
    );
    void account;

    await page.goto("/consultantes");
    await page.getByRole("button", { name: /Nuevo consultante/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.goBack();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/consultantes/);
  });

  test("en móvil cierra el selector de cartas sin perder la lectura", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "El cierre por atrás aplica a móvil y tablet"
    );
    void account;

    await page.goto("/lecturas/nueva");
    await page
      .getByRole("button", { name: /Siguiente: (Indicar cartas|Cartas)/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
    ).toBeVisible();

    await page.getByRole("combobox").first().click();
    await expect(
      page.getByRole("searchbox", {
        name: /Buscar carta por nombre, símbolo o palabra clave/i,
      })
    ).toBeVisible();

    await page.goBack();

    await expect(
      page.getByRole("searchbox", {
        name: /Buscar carta por nombre, símbolo o palabra clave/i,
      })
    ).toBeHidden();
    await expect(page).toHaveURL(/\/lecturas\/nueva/);
  });

  test("protege una lectura sin guardar y permite descartarla", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();

    // Navegación SPA: el botón atrás del navegador dispara popstate en el
    // mismo documento, que es el caso que protege el guard.
    await page
      .getByRole("link", { name: /Nueva lectura/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/lecturas\/nueva/);

    await page
      .getByLabel(/Pregunta o tema de la consulta/i)
      .fill("¿Qué ciclo se abre este trimestre?");
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);

    await page.goBack();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/¿Deseas salir de la lectura\?/i)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/lecturas\/nueva/);

    await dialog.getByRole("button", { name: /^Cancelar$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/lecturas\/nueva/);

    await page.goBack();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Salir sin guardar/i }).click();

    await expect(page).toHaveURL("/");
  });
});
