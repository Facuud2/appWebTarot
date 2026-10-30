import { test, expect } from "../fixtures/test";
import { openDemoWorkspace } from "../fixtures/test";
import { clickFooterAction } from "../helpers/ui";

async function goToStepTwo(
  page: import("@playwright/test").Page,
  question = "¿Qué ciclo se abre durante este trimestre?"
) {
  await page.goto("/lecturas/nueva");
  await expect(
    page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
  ).toBeVisible();
  await page
    .getByLabel(/Pregunta o tema de la consulta/i)
    .fill(question);
  // Espera a que React hidrate los handlers antes de pulsar "Siguiente".
  await page.waitForTimeout(500);
  await clickFooterAction(
    page,
    page.getByRole("button", { name: /Siguiente: (Indicar cartas|Cartas)/i })
  );
  await expect(
    page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
  ).toBeVisible();
}

async function pickFirstCard(page: import("@playwright/test").Page, index = 0) {
  await page.getByRole("combobox").nth(index).click();
  const search = page.getByRole("searchbox", {
    name: /Buscar carta por nombre, símbolo o palabra clave/i,
  });
  await search.fill("loco");
  await page.getByRole("option", { name: /El Loco/i }).click();
  await expect(search).toBeHidden();
}

test.describe("Lecturas", () => {
  test("la demostración abre con agenda y datos de ejemplo @smoke", async ({
    page,
  }) => {
    await openDemoWorkspace(page);

    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Revisión de primeros contratos y ritmo del taller/i).first()
    ).toBeVisible();
  });

  test("crea una lectura completa con una carta y la guarda", async ({
    page,
    account,
  }) => {
    void account;

    await goToStepTwo(page);
    await pickFirstCard(page);

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Acomodar cartas|Tapete)/i,
      })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 3: Acomodar Mesa/i })
    ).toBeVisible();

    await page
      .getByLabel(/Título de la lectura/i)
      .fill("Lectura E2E de claridad");
    await page
      .getByLabel(/Significado y observaciones/i)
      .fill("La lectura confirma un cambio de ciclo y pide sostener el rumbo.");
    await page.waitForTimeout(400);

    const complete = page
      .getByRole("button", {
        name: /Completar y guardar lectura|Finalizar lectura/i,
      })
      .last();
    await clickFooterAction(page, complete);

    await expect(page).toHaveURL(/\/lecturas\/read-/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Lectura E2E de claridad/i,
      })
    ).toBeVisible();

    await page.getByRole("button", { name: /Mesa en vivo/i }).click();
    await expect(
      page.getByRole("heading", { name: /Cartas en la mesa/i })
    ).toBeVisible();

    await page.goto("/lecturas");
    await expect(
      page.getByText(/Lectura E2E de claridad/i).first()
    ).toBeVisible();
  });

  test("guarda una lectura con un consultante recién registrado", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/lecturas/nueva");
    await expect(
      page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /Nuevo consultante/i }).click();
    await page
      .getByLabel(/Nombre o alias del nuevo consultante/i)
      .fill("Camila E2E");
    await page.getByRole("button", { name: "Añadir", exact: true }).click();
    await page
      .getByLabel(/Pregunta o tema de la consulta/i)
      .fill("¿Qué ciclo se abre con el nuevo consultante?");
    await page.waitForTimeout(500);

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Indicar cartas|Cartas)/i,
      })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
    ).toBeVisible();
    await pickFirstCard(page);

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Acomodar cartas|Tapete)/i,
      })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 3: Acomodar Mesa/i })
    ).toBeVisible();

    await page
      .getByLabel(/Título de la lectura/i)
      .fill("Lectura E2E con consultante nuevo");
    await page
      .getByLabel(/Significado y observaciones/i)
      .fill("La lectura abre un ciclo y confirma el acompañamiento.");
    await page.waitForTimeout(400);

    await clickFooterAction(
      page,
      page
        .getByRole("button", {
          name: /Completar y guardar lectura|Finalizar lectura/i,
        })
        .last()
    );

    // Antes fallaba con un error de FK porque el formulario enviaba `__new__`.
    await expect(page).toHaveURL(/\/lecturas\/read-/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Lectura E2E con consultante nuevo/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/Camila E2E/).first()).toBeVisible();
  });

  test("guarda un borrador sin completar la lectura", async ({
    page,
    account,
  }) => {
    void account;

    await goToStepTwo(page, "Borrador de prueba E2E");
    await pickFirstCard(page);

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Acomodar cartas|Tapete)/i,
      })
    );
    await page.getByLabel(/Título de la lectura/i).fill("Borrador E2E");
    await page.waitForTimeout(400);

    const saveDraft = page
      .getByRole("button", { name: /Guardar borrador/i })
      .last();
    await clickFooterAction(page, saveDraft);
    await expect(
      page.getByText(/Borrador guardado correctamente/i)
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/lecturas");
    await expect(page.getByText(/Borrador E2E/i).first()).toBeVisible();
  });

  test("guarda la estructura personalizada como plantilla del grimorio", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/lecturas/nueva");
    await expect(
      page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
    ).toBeVisible();
    await page.waitForTimeout(500);

    await page
      .getByLabel(/Pregunta o tema de la consulta/i)
      .fill("¿Cómo se ordena la estructura propia?");
    await page
      .getByLabel(/Estructura de cartas a utilizar/i)
      .selectOption("custom");
    await page
      .getByLabel(/Nombre de la estructura personalizada/i)
      .fill("Tirada E2E");

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Indicar cartas|Cartas)/i,
      })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
    ).toBeVisible();
    await pickFirstCard(page);

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Acomodar cartas|Tapete)/i,
      })
    );
    await page.getByLabel(/Título de la lectura/i).fill("Lectura con tirada E2E");
    await page.waitForTimeout(400);

    await clickFooterAction(
      page,
      page
        .getByRole("button", {
          name: /Completar y guardar lectura|Finalizar lectura/i,
        })
        .last()
    );
    await expect(page).toHaveURL(/\/lecturas\/read-/);

    // La estructura queda disponible en el grimorio como plantilla propia.
    await page.goto("/grimorio?tab=tiradas");
    await expect(
      page.getByRole("heading", { name: "Tirada E2E" })
    ).toBeVisible();
  });
});
