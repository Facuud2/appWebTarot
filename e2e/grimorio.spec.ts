import { expect, test } from "@playwright/test";

test.describe("Mesa de Tarot — Flujos críticos E2E", () => {
  test("1. Explora el espacio de demostración y consulta el catálogo de 78 cartas", async ({
    page,
  }) => {
    await page.goto("/acceso");
    await expect(
      page.getByRole("heading", {
        name: /Agenda, registro de lecturas y catálogo de cartas/i,
      })
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Abrir demostración/i })
      .click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();

    await page.goto("/grimorio");
    await expect(
      page.getByRole("heading", { name: /Cartas y mazos/i })
    ).toBeVisible();
    await expect(page.getByText("El Loco")).toBeVisible();
  });

  test("2. Registra una cuenta privada aislada, crea un consultante y abre una lectura con mazo rápido", async ({
    page,
  }) => {
    await page.goto("/acceso");
    await page.getByRole("tab", { name: /Crear cuenta/i }).click();

    const uniqueEmail = `tarot-${Date.now()}@estudio.local`;
    await page.getByLabel(/Tu nombre/i).fill("Elena Vidal");
    await page.getByLabel(/Nombre del espacio/i).fill("Mesa de Cobre");
    await page.getByLabel(/Correo electrónico/i).fill(uniqueEmail);
    await page.getByLabel(/Contraseña nueva/i).fill("clave-segura-9876");
    await page.getByRole("button", { name: /Crear cuenta/i }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Mesa de Cobre" })
    ).toBeVisible();

    // Crear consultante con alias
    await page.goto("/consultantes?nuevo=1");
    await page
      .getByLabel(/Nombre o identificador/i)
      .fill("Consultante Bosque");
    await page.getByLabel(/Alias/i).fill("Bosque");
    await page.getByRole("button", { name: /Crear ficha/i }).click();

    await expect(page.getByText("Bosque")).toBeVisible();

    // Abrir lectura registrando un mazo nuevo al vuelo
    await page.goto("/lecturas/nueva");
    await page.getByLabel(/Registrar mazo/i).check();
    await page
      .getByPlaceholder(/Ej\. Tarot Rider-Waite de bolsillo/i)
      .fill("Tarot Marsella Nuevo");
    await page
      .getByLabel(/Pregunta o tema de la consulta/i)
      .fill("¿Qué ciclo se abre durante este trimestre?");
    await page.getByRole("button", { name: /Abrir mesa en vivo/i }).click();

    await expect(page).toHaveURL(/\/lecturas\/read-/);
    await expect(
      page.getByRole("heading", { name: /Cartas en la mesa/i })
    ).toBeVisible();

    // Verificar notificación en Inicio para completar los datos del mazo registrado
    await page.goto("/");
    await expect(
      page.getByText(/Tienes un mazo pendiente de completar/i)
    ).toBeVisible();
    await expect(page.getByText("Tarot Marsella Nuevo")).toBeVisible();
  });
});
